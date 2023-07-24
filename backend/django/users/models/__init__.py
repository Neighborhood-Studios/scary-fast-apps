import os

# autoload models
for __module in os.listdir(os.path.dirname(__file__)):
    if __module == '__init__.py' or __module[-3:] != '.py':
        continue
    __import__(__module[:-3], locals(), globals(), level=1)
del __module
