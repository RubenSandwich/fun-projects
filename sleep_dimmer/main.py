
from machine import ADC, Pin, Timer
from micropython import alloc_emergency_exception_buf
from math import acos, pi

import time
import neopixel
import uasyncio as asyncio

# # Define an asynchronous background task
# async def background_task():
#     while True:
#         print("Background task is running.")
#         await asyncio.sleep(2)  # Delay for 2 seconds

# # Define the main function
# async def main():
#     # Create the background task
#     asyncio.create_task(background_task())

#     # Main task (e.g., timer)
#     for i in range(10):
#         print("Main task iteration:", i)
#         await asyncio.sleep(1)  # Delay for 1 second

# # Run the main function
# asyncio.run(main())


class Dimmer:
    def __init__(self, pwm_pin, zc_pin, fpulse=4000):
        alloc_emergency_exception_buf(100)
        self._cnt = 0
        self._freq = 0
        self._timer = Timer()
        self._mode = Timer.ONE_SHOT
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
                mode=self._mode,
                callback=self._dimmDelayIsr
            )

    def _dimmDelayIsr(self, _timer):
        if 1 == self._cnt:
            self._pwm.on()
            self._timer.init(
                freq=self._fpulse,
                mode=self._mode,
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
        if p < 0.2:  # below 20% the light flickers
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
    def __init__(self, pin, threshold=1000, callback=None):
        self.adc = ADC(pin)
        self.threshold = threshold
        self.callback = callback
        self.last_value = self.adc.read_u16()
        self.timer = Timer()
        self.start_monitoring()

    def start_monitoring(self):
        self.timer.init(
            period=100,
            mode=Timer.PERIODIC,
            callback=self.check_value
        )

    def check_value(self, timer):
        current_value = self.adc.read_u16()

        if abs(current_value - self.last_value) > self.threshold:
            if self.callback:
                self.callback(self.percentage())

            self.last_value = current_value

    def percentage(self):
        return round(self.adc.read_u16() / 65535, 2)


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
        self.np = neopixel.NeoPixel(led_pin, 1)
        self.brightness = 100
        self.pixel_max = 255  # hardware max
        self.color_max = 255  # mapped max

        self.debounce_ms = 750
        self._next_debounce = time.ticks_ms()

        self._light_state = LightStates.Off
        self.button = Pin(button_pin, Pin.IN, Pin.PULL_UP)
        self.button.irq(
            trigger=Pin.IRQ_FALLING,
            handler=self.__debounce_handler
        )
        self.pressed_callback = pressed_callback

        self.light_state_color = {
            LightStates.Off: (0, 0, 0), # off
            LightStates.Potentiometer: (144, 238, 144),  # light green
            LightStates.Breath: (255, 255, 224), # light yellow
            LightStates.Sleep: (173, 216, 230), # light blue
        }

    @property
    def light_state(self):
        return self._light_state

    def set_brightness(self, new_brightness):
        self.brightness = new_brightness
        self.color_max = int((new_brightness / 100) * self.pixel_max)

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

            self._light_state = LightStates.next_state(self._light_state)
            self.set_color(self.light_state_color[self.light_state])

            self.pressed_callback(pin, self._light_state)

    def __map_color_brightness(self, value):
        src_min, src_max = (0, self.pixel_max)
        tgt_min, tgt_max = (0, self.color_max)

        mapped_value = (value - src_min) / (src_max - src_min) * \
            (tgt_max - tgt_min) + tgt_min
        return int(mapped_value)


pin = Pin("LED", Pin.OUT)


def button_pressed(pin, light_state):
    dimmer.value = value
    print("Button pressed!")


button_with_rgb = ButtonWithRGB(Pin(0), Pin(1), button_pressed)
button_with_rgb.set_brightness(1)
button_with_rgb.set_color((255, 0, 0))


def potentiometer_changed(value):
    print("Potentiometer Percentage Turned: {:.2f}%".format(value))

    dimmer.value = value

    if value == 1.0:
        pin.on()
    else:
        pin.off()

potentiometer = Potentiometer(Pin(26), 1000, potentiometer_changed)

dimmer = Dimmer(4, 2)
dimmer.value = potentiometer.percentage()


async def main():
    while True:
        await asyncio.sleep(1)


try:
    asyncio.run(main())
except KeyboardInterrupt:
    pin.off()
    button_with_rgb.off()
    print("Finished.")
