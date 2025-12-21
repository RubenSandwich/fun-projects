from PIL import Image, ImageDraw, ImageFont
from escpos.printer import Usb

from signal import pause
from gpiozero import Button
from datetime import datetime

import textwrap
import logging
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--debug', action='store_true')
parser.add_argument('--dontPrint', action='store_true')

args = parser.parse_args()

printer = Usb(0x4b43, 0x3538, 0, profile="ZJ-5870", in_ep=81, out_ep=3)

log_file = "/home/pi/py_log.log"
todo_file = "/home/pi/todos.png"
funny_file = "/home/pi/fun_image.png"
celebrate_file = "/home/pi/celebration.png"

last_printed_date = datetime.now()
times_printed_today = 0
printing = False

logging.basicConfig(
    level=logging.INFO,
    filename=log_file,
    filemode="a",
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%m/%d/%Y %I:%M:%S %p',
)


def log_newline(log_file):
    f = open(log_file, "a")
    f.write("\n")
    f.close()


def debug_print(msg):
    if args.debug:
        print(msg)


def print_todo_file(print_file):
    debug_print("started printing")

    if args.dontPrint is False:
        printer.image(print_file)
        printer.ln(3)

    debug_print("finished printing")

def create_todo_img(tasks):
    width, temp_height = printer_width, 3000
    image = Image.new('RGBA', (width, temp_height))

    fontSize = 30
    line_spacing = 15
    y_pos = line_spacing

    current_date = datetime.today()
    formatted_date = current_date.strftime("%d/%m/%y")

    y_pos = draw_text(
        image,
        fontSize + 5,
        "Rubens todos %s" % (formatted_date),
        "black",
        y_pos,
        line_spacing * 3
    )

    # Write the text to the image
    for task in tasks:
        text = task.content
        y_pos = draw_todo(
            image,
            fontSize,
            text,
            "black",
            y_pos,
            line_spacing
        )

    # We can't use resize as that resizes the images content, so we make a new image that is the size we want and then past the old image into that one
    new_width_image = Image.new('RGBA', (width, y_pos))
    new_width_image.paste(image)

    new_width_image = new_width_image.rotate(180)
    new_width_image.save(todo_file, quality=100)

    debug_print(f"Image saved to {todo_file}")


def create_funny_img(times_printed_today):
    width, temp_height = printer_width, 3000
    image = Image.new('RGBA', (width, temp_height))

    fontSize = 30
    line_spacing = 15
    y_pos = line_spacing

    if times_printed_today == 7:
        fun_img = Image.open(funny_file)
        image.paste(fun_img, (0, y_pos))
        fun_img.close()
        y_pos += (fun_img.height + line_spacing)

    text = None
    if times_printed_today == 1:
        text = "No change in todos"
    elif times_printed_today == 2:
        text = "Bro you already printed today"
    elif times_printed_today == 3:
        text = "No"
    elif times_printed_today == 4:
        text = "Do i bother you at work?"
    elif times_printed_today == 5:
        text = "Printing kind of hurts me, please stop"
    elif times_printed_today == 6:
        text = "Go away"
    elif times_printed_today == 7:
        text = "I drew a picture of you"
    elif times_printed_today == 8:
        text = "I'm done"

    if text is None:
        return True

    y_pos = draw_text(
        image,
        fontSize + 5,
        text,
        "black",
        y_pos,
        line_spacing * 3,
    )

    # We can't use resize as that resizes the images content, so we make a new image that is the size we want and then past the old image into that one
    new_width_image = Image.new('RGBA', (width, y_pos))
    new_width_image.paste(image)

    new_width_image = new_width_image.rotate(180)
    new_width_image.save(todo_file, quality=100)

    return False


def create_celebration_img():
    width, temp_height = printer_width, 3000
    image = Image.new('RGBA', (width, temp_height))

    fontSize = 30
    line_spacing = 15
    y_pos = line_spacing

    celebrate_img = Image.open(celebrate_file)
    image.paste(celebrate_img, (0, y_pos))
    celebrate_img.close()
    y_pos += (celebrate_img.height + line_spacing)

    current_date = datetime.today()
    formatted_date = current_date.strftime("%d/%m/%y")
    text = "Congratulations Ruben you finished your todos for %s!" % (
        formatted_date)

    y_pos = draw_text(
        image,
        fontSize + 5,
        text,
        "black",
        y_pos,
        line_spacing * 3,
    )

    # We can't use resize as that resizes the images content, so we make a new image that is the size we want and then past the old image into that one
    new_width_image = Image.new('RGBA', (width, y_pos))
    new_width_image.paste(image)

    new_width_image = new_width_image.rotate(180)
    new_width_image.save(todo_file, quality=100)


def print_todos():
    global times_printed_today
    global last_printed_date
    global last_task_ids
    global printing

    if printing:
        logging.info(f"Already printing")
        debug_print(f"Already printing")
        return

    printing = True

    logging.info(f"Button Pressed, times today: {times_printed_today}")
    debug_print(f"Button Pressed, times today: {times_printed_today}")

    current_date = datetime.today()

    if last_printed_date.date() < current_date.date():
        logging.info("new print today")
        debug_print("new print today")
        times_printed_today = 0
        last_task_ids = []

    try:
        tasks_changed = False
        tasks = api.get_tasks(filter="today | overdue")

        completed_tasks = False
        if len(tasks) == 0:
            completed_tasks = True

        task_ids = []
        new_task_ids = []
        for task in tasks:
            task_ids.append(task.id)

            if not task.id in last_task_ids:
                new_task_ids.append(task.id)

        if completed_tasks == False and \
                times_printed_today != 0 and \
                len(new_task_ids) != 0:

            last_task_ids = task_ids
            tasks_changed = True
            times_printed_today = 0

            logging.info("tasks changed")
            debug_print("tasks changed")

        no_more_prints = False
        if completed_tasks:
            debug_print("printing completed")
            create_celebration_img()
        elif times_printed_today == 0 or tasks_changed:
            debug_print("printing todos")
            create_todo_img(tasks)
        else:
            debug_print("printing funny")
            no_more_prints = create_funny_img(times_printed_today)

        if not no_more_prints:
            print_todo_file(todo_file)

            if times_printed_today == 0:
                last_printed_date = current_date
                last_task_ids = task_ids
                logging.info("finished todays print")
                debug_print("finished todays print")
                log_newline(log_file)

        times_printed_today += 1

    except Exception as error:
        logging.error(error)

    finally:
        printing = False


def print_funny():
    global printing

    debug_print(f"Button held")

    if printing:
        logging.info(f"Already printing")
        debug_print(f"Already printing")
        return

    printing = True

    try:

        tasks = api.get_tasks(filter="today | overdue")
        create_todo_img(tasks)
        print_todo_file(todo_file)

    except Exception as error:
        logging.error(error)

    finally:
        printing = False


class PrintButton:
    def __init__(self, pin, callback):
        self.button = Button(pin)
        self.callback = callback

        self.button.when_pressed = self.pressed_button

    def pressed_button(self):
        debug_print(f"button pressed")
        self.callback()

    def change_color(self):
        pass


class Printer:
    def __init__(self):
        self.printer = Usb(
            0x4b43,
            0x3538,
            0,
            profile="ZJ-5870",
            in_ep=81,
            out_ep=3
        )
        self.printing = False

        self.font_name = "NotoSansMono-Bold.ttf"
        self.printer_width = 384
        self.temp_height = 3000
        self.line_spacing = 15
        self.y_pos = self.line_spacing

        self.print_image = None

    def create_image(self):
        width, temp_height = self.printer_width, self.temp_height
        self.print_image = Image.new('RGBA', (width, temp_height))
        self.y_pos = self.line_spacing

    def print_image(self, flip=False):
        if self.print_image == None:
            print("img undef in print_image")
            return

        if self.printing == True:
            print("already printing")
            return

        self.printing = True

        # We can't use resize as that resizes the images content, so we make a new image that is the size we want and then paste the old image into that one
        new_height_image = Image.new(
            'RGBA',
            (self.printer_width, self.y_pos)
        )
        new_height_image.paste(self.print_image)

        if flip == True:
            new_height_image = new_height_image.rotate(180)

        try:
            self.printer.image(new_height_image)

        except Exception as error:
            print(error)

        finally:
            self.printing = False

    def create_timebox(self):
        fontSize = 30



        self.create_image()
        timebox_hours = [
            "8",
            "9",
            "10",
            "11",
            "12",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8"
        ]

        for hour in timebox_hours:
            self.draw_text(
                fontSize,
                hour,
                "black",
            )

        self.draw_new_lines(3)
        self.print_image(flip=True)

    def draw_new_lines(self, new_lines=1):
        if self.print_image == None:
            print("img undef in draw_new_lines")
            return

        editing_y_pos = self.y_pos

        editing_y_pos += self.line_spacing * new_lines

        self.y_pos = editing_y_pos

    def draw_text(
        self,
        fontSize,
        text,
        text_color,
        end_spacing=None
    ):
        if self.print_image == None:
            print("img undef in draw_text")
            return

        if end_spacing is None:
            end_spacing = self.line_spacing

        draw = ImageDraw.Draw(self.print_image)
        font = ImageFont.truetype(self.font_name, fontSize)

        newline_h_spacing = 3
        editing_y_pos = self.y_pos

        (char_width, _) = font.getsize("w")
        chars_per_line = self.printer_width // char_width

        lines = textwrap.wrap(text, width=chars_per_line)
        for line in lines:
            draw.text(
                (0, editing_y_pos),
                line,
                font=font,
                fill=text_color
            )

            editing_y_pos += fontSize + newline_h_spacing

        self.y_pos = editing_y_pos + end_spacing


    def draw_todo(
        self,
        fontSize,
        text,
        text_color,
        end_spacing=None
    ):
        if self.print_image == None:
            print("img undef in draw_todo")
            return

        if end_spacing == None:
            end_spacing = self.line_spacing

        draw = ImageDraw.Draw(self.print_image)
        font = ImageFont.truetype(self.font_name, fontSize)

        newline_h_spacing = 3
        editing_y_pos = self.y_pos

        circle_r = fontSize / 2
        circle_x = circle_r
        circle_y = editing_y_pos + circle_r
        circle_diameter = circle_r * 2

        draw.ellipse(
            [
                (circle_x - circle_r, circle_y - circle_r),
                (circle_x + circle_r, circle_y + circle_r)
            ],
            fill=None,
            outline="black",
            width=7
        )

        (char_width, _) = font.getsize("w")
        text_start_x = circle_diameter + circle_r
        chars_per_line = (self.printer_width - text_start_x) // char_width

        # empty todo so draw two lines of underscores "_"
        if text == None or text == "":
            text = "_" * (chars_per_line * 2)

        lines = textwrap.wrap(text, width=chars_per_line)
        # Should the next line not have an indent?
        for line in lines:
            draw.text(
                (text_start_x, editing_y_pos - (circle_r / 2)),
                line,
                font=font,
                fill=text_color
            )

            editing_y_pos += fontSize + newline_h_spacing

        self.y_pos = editing_y_pos + end_spacing



debug_print(f"args {args}")
debug_print(f"fully initialized")

pause()
