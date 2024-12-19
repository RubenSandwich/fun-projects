## todo printer

A receipt printer that downloads my todoist todo list and prints it out

![the todo printer](./pictures/IMG_8236.jpeg)

## BOM

* pi w zero
* 5V 1A power supply
* [ChromaTek Full-Color RGB (WS2812) 19mm Momentary Push Button Switch](https://www.amazon.com/gp/product/B0989BL58B/ref=ppx_yo_dt_b_asin_title_o06_s00?ie=UTF8&th=1)
* [Tiny Thermal Receipt Printer - TTL Serial / USB](https://www.adafruit.com/product/2751)

```
sshfs -o kill_on_unmount pi@192.168.1.207: ~/Projects/printer_pi_fs

diskutil umount force ~/Projects/printer_pi_fs

sudo systemctl

todos-printer.service
```

MIT License
