
from machine import ADC, Pin, Timer # type: ignore
from micropython import alloc_emergency_exception_buf # type: ignore
from math import acos, pi, sin

import time
import neopixel # type: ignore


def map_value(val, src, dst):
    return ((val - src[0]) / (src[1]-src[0])) * (dst[1]-dst[0]) + dst[0]


class Dimmer:
    def __init__(self, pwm_pin, zc_pin, fpulse=4000):
        alloc_emergency_exception_buf(100)

        self._val = 1
        self.zeroCrossoverPin = Pin(zc_pin, Pin.IN, Pin.PULL_DOWN)
        self.triacFiringPin   = Pin(pwm_pin, Pin.OUT, value=0)
        self.freq  = 200 # just to start somewhere
        self._timer = Timer()

        # to start remember to turn_on()

        # below this, the dimmer doesn't work
        self.DIMMER_OFFSET = 20

        #  Used in breathing mode
        sine_range_min = 35
        sine_range_max = 80
        self.TOTAL_PERIOD = 5  # Period in seconds
        self.AMPLITUDE = (sine_range_max - sine_range_min) / 2
        self.OFFSET = (sine_range_max + sine_range_min) / 2
        self.BREATHE_UPDATES_PER_SEC = 10
        self.breathe_timer = Timer()

        #  Used in sleeping mode
        self.sleep_update_timer = Timer()
        self.sleep_finished_timer = Timer()
        self.sleep_finished_callback = None
        self.SLEEP_UPDATES_PER_MIN = 10
        self.SLEEP_FADE_OUT_MINS = 30

        self.sleep_index = 0
        num_steps = self.SLEEP_FADE_OUT_MINS * self.SLEEP_UPDATES_PER_MIN
        # offset because below DIMMER_OFFSET the dimmer doesn't work
        self.step_size = (100 - self.DIMMER_OFFSET) / (num_steps - 1)

    def start_breathing(self):
        self.value = self.DIMMER_OFFSET
        self.breathe_timer.init(
            period=(1000 // self.BREATHE_UPDATES_PER_SEC),
            mode=Timer.PERIODIC,
            callback=self.set_dimmer_to_sine_wave_value
        )

    def stop_breathing(self):
        self.breathe_timer.deinit()

    def set_dimmer_to_sine_wave_value(self, timer):
        current_time = time.ticks_ms() / 1000
        sine_value = self.OFFSET + self.AMPLITUDE * \
            sin(pi * current_time / self.TOTAL_PERIOD)

        self.value = sine_value

    def start_sleeping(self, callback):
        self.value = 100
        self.sleep_finished_callback = callback
        self.sleep_index = 0
        self.sleep_update_timer.init(
            period=(1000 * 60 // self.SLEEP_UPDATES_PER_MIN),
            mode=Timer.PERIODIC,
            callback=self.slowly_fade
        )

        self.sleep_finished_timer.init(
            period=(1000 * 60 * self.SLEEP_FADE_OUT_MINS),
            mode=Timer.ONE_SHOT,
            callback=self.stop_sleeping_timer
        )

    def stop_sleeping_timer(self, timer):
        if self.sleep_finished_callback:
            self.sleep_finished_callback()

        self.turn_off()
        self.stop_sleeping()

    def stop_sleeping(self):
        self.sleep_index = 0
        self.sleep_update_timer.deinit()
        self.sleep_finished_timer.deinit()
        self.sleep_finished_callback = None

    def slowly_fade(self, timer):
        # count down from 100
        new_value = 100 - (self.step_size * self.sleep_index)
        self.value = new_value

        self.sleep_index = self.sleep_index + 1

    def triacpulse(self, timer):
        self.triacFiringPin.high()
        a = 2.0 * 2.0 # type: ignore - we want a small delay
        self.triacFiringPin.low()

    def ZeroCrossover(self, arg):
        self.triacFiringPin.low()
        self._timer.init(
            freq=self.freq,
            mode=Timer.ONE_SHOT,
            callback=self.triacpulse
        )

    def turn_off(self):
        # we go below the offset to turn off the interrupt
        self.value = self.DIMMER_OFFSET + 5
        self.zeroCrossoverPin.irq(handler=None)

    def turn_on(self):
        self.zeroCrossoverPin.irq(
            trigger=Pin.IRQ_RISING,
            handler=self.ZeroCrossover
        )

    @property
    def value(self):
        return self._val

    @value.setter
    def value(self, p):
        # above this the dimmer gets angry :(
        if p > 98:
            p = 98

        p = p/100
        p = min(1, max(0, p))
        p = acos(1 - p * 2) / pi

        #  TODO: If we are already at the value should we turn off the zeroCrossoverPin interrupt?
        if not self._val == p:
            self._val = p

            if p < 0.15 :
                self.freq = 20
            elif p > 0.99:
                self.freq = 0
            else:
                self.freq = int(100 / (1 - p))

        return self._val


class Potentiometer:
    def __init__(self, pot_pin, threshold=1000, changed_callback=None):
        self._potentiometer = ADC(Pin(pot_pin))
        self.threshold = threshold
        self.callback = changed_callback
        self.last_value = self._potentiometer.read_u16()
        self.timer = Timer()

    def turn_on(self):
        self.timer.init(
            period=100,
            mode=Timer.PERIODIC,
            callback=self.check_value
        )

    def turn_off(self):
        self.timer.deinit()

    def check_value(self, timer):
        current_value = self._potentiometer.read_u16()

        if abs(current_value - self.last_value) > self.threshold:
            if self.callback:
                self.callback(self.percentage())

            self.last_value = current_value

    def percentage(self):
        return round(self._potentiometer.read_u16() / 65535, 2)


class LightStates:
    Off = "Off"
    Potentiometer = "Potentiometer"
    Breath = "Breath"
    Sleep = "Sleep"

    @staticmethod
    def next_state(cur_state):
        next_states = {
            LightStates.Off: LightStates.Potentiometer,
            LightStates.Potentiometer: LightStates.Breath,
            LightStates.Breath: LightStates.Sleep,
            LightStates.Sleep: LightStates.Off
        }

        return next_states[cur_state]


class ButtonWithRGB:
    def __init__(self, led_pin, button_pin, pressed_callback):
        self.np = neopixel.NeoPixel(Pin(led_pin), 1)
        self.brightness = 100
        self.pixel_max = 255  # hardware max
        self.color_max = 255  # mapped max

        self.debounce_ms = 750
        self._next_debounce = time.ticks_ms()

        self.button = Pin(button_pin, Pin.IN, Pin.PULL_UP)
        self.button.irq(
            trigger=Pin.IRQ_FALLING,
            handler=self.__debounce_handler
        )
        self.pressed_callback = pressed_callback

        self.light_state_color = {
            LightStates.Off: (0, 0, 0),  # off
            LightStates.Potentiometer: (0, 255, 0),  # green
            LightStates.Breath: (255, 165, 0),  # orange
            LightStates.Sleep: (0, 0, 255),  # blue
        }

    def set_brightness(self, new_brightness):
        self.brightness = new_brightness
        self.color_max = int((new_brightness / 100) * self.pixel_max)
        self.set_color(self.np[0])  # type: ignore

    def set_color_by_light_state(self, new_light_state):
        self.set_color(self.light_state_color[new_light_state])

    def set_color(self, rgb):
        r, g, b = rgb

        mapped_rgb = (
            self.__map_color_brightness(r),
            self.__map_color_brightness(g),
            self.__map_color_brightness(b)
        )

        self.np[0] = mapped_rgb  # type: ignore
        self.np.write()

    def off(self):
        self.np[0] = (0, 0, 0)  # type: ignore
        self.np.write()

    def __debounce_handler(self, pin):
        if time.ticks_ms() > self._next_debounce:
            self._next_debounce = time.ticks_ms() + self.debounce_ms
            self.pressed_callback(pin)

    def __map_color_brightness(self, value):
        return int(map_value(value, (0, self.pixel_max), (0, self.color_max)))


# BEGIN - Input callbacks
def finished_sleeping_callback():
    global light_state

    light_state = LightStates.Off
    button_with_rgb.set_color_by_light_state(light_state)


def button_pressed(pin):
    global light_state, dimmer, potentiometer

    prev_light_state = light_state

    if prev_light_state == LightStates.Breath:
        dimmer.stop_breathing()
    elif prev_light_state == LightStates.Sleep:
        dimmer.stop_sleeping()
    elif prev_light_state == LightStates.Potentiometer:
        potentiometer.turn_off()
    elif prev_light_state == LightStates.Off:
        dimmer.turn_on()

    light_state = LightStates.next_state(light_state)
    button_with_rgb.set_color_by_light_state(light_state)

    #  TODO: 2. Turn off PWM interrupts & timers if off

    if light_state == LightStates.Breath:
        dimmer.start_breathing()
    elif light_state == LightStates.Potentiometer:
        potentiometer.turn_on()
        potentiometer_changed(potentiometer.percentage())
    elif light_state == LightStates.Sleep:
        dimmer.start_sleeping(finished_sleeping_callback)
    elif light_state == LightStates.Off:
        dimmer.turn_off()


def potentiometer_changed(value):
    global light_state, dimmer

    if light_state != LightStates.Potentiometer:
        return

    mapped_value = map_value(
        value,
        (0, 1.0),
        (dimmer.DIMMER_OFFSET + 10, 100) # slightly higher as we don't want it to turn completely off in potentiometer mode
    )

    dimmer.value = mapped_value

# END - Input callbacks


light_state = LightStates.Off
pin = Pin("LED", Pin.OUT)  # pi pico board LED
pin.on()

button_with_rgb = ButtonWithRGB(
    led_pin=0,
    button_pin=1,
    pressed_callback=button_pressed
)
button_with_rgb.set_brightness(10)
button_with_rgb.set_color_by_light_state(light_state)

potentiometer = Potentiometer(
    pot_pin=26,
    threshold=1000,
    changed_callback=potentiometer_changed
)

dimmer = Dimmer(pwm_pin=4, zc_pin=2)

# run loop
try:
    while True:
        time.sleep(0.1)
except KeyboardInterrupt:
    pin.off()
    button_with_rgb.off()
    dimmer.turn_off()
