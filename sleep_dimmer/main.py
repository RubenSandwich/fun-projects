
from machine import ADC, Pin, Timer
from micropython import alloc_emergency_exception_buf
from math import acos, pi, sin

import time
import neopixel

class Dimmer:
    def __init__(self, pwm_pin, zc_pin, fpulse=4000):
        alloc_emergency_exception_buf(100)
        self._cnt = 0
        self._freq = 0
        self._timer = Timer()
        self._pwm = Pin(pwm_pin, Pin.OUT)
        self._fpulse = fpulse
        self._ppulse = 100.0 / fpulse + 0.11
        self._zc = Pin(zc_pin,  Pin.IN)
        self._val = 1
        self.interrupt_active = True
        self._zc.irq(
            trigger=Pin.IRQ_RISING,
            handler=self._zeroDetectIsr
        )

        #  Used in breathing mode
        sine_range_min = 0.4
        sine_range_max = 1
        self.TOTAL_PERIOD = 2 # Period in seconds
        self.AMPLITUDE = (sine_range_max - sine_range_min) / 2
        self.OFFSET = (sine_range_max + sine_range_min) / 2
        self.BREATHE_UPDATES_PER_SEC = 25
        self.breathe_timer = Timer()

        #  Used in sleeping mode
        self.sleep_update_timer = Timer()
        self.sleep_finished_timer = Timer()
        self.sleep_finished_callback = None
        self.SLEEP_UPDATES_PER_MIN = 5
        self.SLEEP_FADE_OUT_MINS = 5

        self.sleep_index = 0
        num_steps = self.SLEEP_FADE_OUT_MINS * self.SLEEP_UPDATES_PER_MIN
        self.step_size = 0.8 / (num_steps - 1) # offset because below 0.2 the dimmer zeros out

    def start_breathing(self):
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

        self.stop_sleeping()

    def stop_sleeping(self):
        self.sleep_index = 0
        self.sleep_update_timer.deinit()
        self.sleep_finished_timer.deinit()
        self.sleep_finished_callback = None

    def slowly_fade(self, timer):
        new_value = 1 - (self.step_size * self.sleep_index) #count down from 1.0
        self.value = new_value

        self.sleep_index = self.sleep_index + 1

    def _zeroDetectIsr(self, pin):
        if 0 == self._freq:
            self._pwm.on()
            return

        if 0 > self._freq:
            self._pwm.off()
            return

        self._cnt += 1

        if 1 == self._cnt:
            self._timer.init(
                freq=self._freq,
                mode=Timer.ONE_SHOT,
                callback=self._dimmDelayIsr
            )

    def _dimmDelayIsr(self, _timer):
        if 1 == self._cnt:
            self._pwm.on()
            self._timer.init(
                freq=self._fpulse,
                mode=Timer.ONE_SHOT,
                callback=self._dimmDelayIsr
            )

        else:
            self._pwm.off()

        self._cnt = 0

    def set_interrupt(self, new_interrupt_active):
        self.interrupt_active = new_interrupt_active

        if self.interrupt_active:
            self._zc.irq(
                trigger=Pin.IRQ_RISING,
                handler=self._zeroDetectIsr
            )
        else:
            self._zc.irq(handler=None)

    @property
    def value(self):
        return self._val

    @value.setter
    def value(self, p):
        # below 20% the light flickers, so we also turn off the interrupt
        if p < 0.2:
            p = 0.2

            if self.interrupt_active:
                self.set_interrupt(False)

        else:
            if not self.interrupt_active:
                self.set_interrupt(True)

        p = min(1, max(0, p))

        if not self._val == p:
            self._val = p
            p = acos(1 - p * 2) / pi

            if p < self._ppulse:
                f = -1
            elif p > 0.99:
                f = 0
            else:
                f = 100 / (1 - p)

            self._freq = int(f)

        return self._val


class Potentiometer:
    def __init__(self, pot_pin, threshold=1000, changed_callback=None):
        self._potentiometer = ADC(Pin(pot_pin))
        self.threshold = threshold
        self.callback = changed_callback
        self.last_value = self._potentiometer.read_u16()
        self.timer = Timer()
        self.start_monitoring()

    def start_monitoring(self):
        self.timer.init(
            period=100,
            mode=Timer.PERIODIC,
            callback=self.check_value
        )

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
            LightStates.Off: (0, 0, 0), # off
            LightStates.Potentiometer: (0, 255, 0),  # green
            LightStates.Breath: (255, 165, 0), # orange
            LightStates.Sleep: (0, 0, 255), # blue
        }

    def set_brightness(self, new_brightness):
        self.brightness = new_brightness
        self.color_max = int((new_brightness / 100) * self.pixel_max)
        self.set_color(self.np[0]) # type: ignore

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
        src_min, src_max = (0, self.pixel_max)
        tgt_min, tgt_max = (0, self.color_max)

        mapped_value = (value - src_min) / (src_max - src_min) * \
            (tgt_max - tgt_min) + tgt_min
        return int(mapped_value)


# BEGIN - Input callbacks
def finished_sleeping():
    global light_state

    light_state = LightStates.Off
    button_with_rgb.set_color_by_light_state(light_state)

def button_pressed(pin):
    global light_state, dimmer, potentiometer

    prev_light_state = light_state
    light_state = LightStates.next_state(light_state)
    button_with_rgb.set_color_by_light_state(light_state)

    if prev_light_state == LightStates.Breath:
        dimmer.stop_breathing()
    elif prev_light_state == LightStates.Sleep:
        dimmer.stop_sleeping()


    if light_state == LightStates.Breath:
        dimmer.start_breathing()
    elif light_state == LightStates.Potentiometer:
        dimmer.value = potentiometer.percentage()
    elif light_state == LightStates.Sleep:
        dimmer.start_sleeping(finished_sleeping)
    elif light_state == LightStates.Off:
        dimmer.value = 0


def potentiometer_changed(value):
    global light_state, dimmer

    if light_state != LightStates.Potentiometer:
        return

    dimmer.value = value

# END - Input callbacks


light_state = LightStates.Off
pin = Pin("LED", Pin.OUT) # pi pico board LED
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
dimmer.value = 0

# run loop
try:
    while True:
        time.sleep(0.1)
except KeyboardInterrupt:
    pin.off()
    button_with_rgb.off()
