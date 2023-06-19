import dramatiq


@dramatiq.actor
def dummy(example):
    print(example)
