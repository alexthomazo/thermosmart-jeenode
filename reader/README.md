= ThermoSmart JeeNode Reader =

Reads temperature from JeeNode over i2c.

== Installation ==
Based on `2015-05-05-raspbian-wheezy` Raspbian image :

Run `sudo raspi-config` then select "Advanced Options", "I2C", then answer "YES" to all.

Run `sudo vi /etc/modules` to add the following two lines :
    i2c-bcm2708 
    i2c-dev

For testing, you can use
    sudo aptitude install i2c-tools
    sudo i2cdetect -y 1

