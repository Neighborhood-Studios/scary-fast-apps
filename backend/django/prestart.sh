#! /usr/bin/env sh

# this file is sourced into some shell
cd /app
python manage.py migrate --noinput

cd -
