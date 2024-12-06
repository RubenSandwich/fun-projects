
from machine import ADC, Pin, Timer
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

class Potentiometer:
    def __init__(self, pin, threshold=1000, callback=None):
        self.adc = ADC(pin)
        self.threshold = threshold
        self.callback = callback
        self.last_value = self.adc.read_u16()
        self.timer = Timer()
        self.start_monitoring()

    def start_monitoring(self):
        self.timer.init(period=100, mode=Timer.PERIODIC, callback=self.check_value)

    def check_value(self, timer):
        current_value = self.adc.read_u16()
        if abs(current_value - self.last_value) > self.threshold:
            if self.callback:
                self.callback(current_value)
            self.last_value = current_value

class ButtonWithRGB:
    def __init__(self, led_pin, button_pin, pressed_callback):
        self.np = neopixel.NeoPixel(led_pin, 1)
        self.brightness = 100
        self.pixel_max = 255 # hardware max
        self.color_max = 255 # mapped max

        self.debounce_ms = 750
        self._next_debounce = time.ticks_ms()

        self.button = Pin(button_pin, Pin.IN, Pin.PULL_UP)
        self.button.irq(
            trigger=Pin.IRQ_FALLING,
            handler=self.__debounce_handler
        )
        self.pressed_callback = pressed_callback

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

        self.np[0] = mapped_rgb # type: ignore
        self.np.write()

    def off(self):
        self.np[0] = (0, 0, 0) # type: ignore
        self.np.write()

    def __call_callback(self, pin):
        self.pressed_callback(pin)

    def __debounce_handler(self, pin):
        if time.ticks_ms() > self._next_debounce:
            self._next_debounce = time.ticks_ms() + self.debounce_ms
            self.__call_callback(pin)

    def __map_color_brightness(self, value):
        src_min, src_max = (0, self.pixel_max)
        tgt_min, tgt_max = (0, self.color_max)

        mapped_value = (value - src_min) / (src_max - src_min) * (tgt_max - tgt_min) + tgt_min
        return int(mapped_value)


pin = Pin("LED", Pin.OUT)

def button_pressed(pin):
    print("Button pressed!")

button_with_rgb = ButtonWithRGB(Pin(0), Pin(1), button_pressed)
button_with_rgb.set_brightness(1)
button_with_rgb.set_color((255, 0, 0))

def potentiometer_changed(value):
    percentage = int((value / 65535) * 100)
    print("Potentiometer Percentage Turned: {:d}%".format(percentage))

    if percentage == 100:
        pin.on()
    else:
        pin.off()

potentiometer = Potentiometer(Pin(26), 1000, potentiometer_changed)


async def main():
    while True:
        await asyncio.sleep(1)


try:
    asyncio.run(main())
except KeyboardInterrupt:
    pin.off()
    button_with_rgb.off()
    print("Finished.")
