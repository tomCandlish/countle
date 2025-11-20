import random
import datetime


large_ones = [25, 50, 75, 100]
small_ones = list(range(1,11))*2

def get_big_ones(num_big: int, seed: int = random.randint(1,1000)): 
    if num_big > 4:
        print("too many big")
    if num_big < 0:
        print("too little big")
    large_ones_to_grab = large_ones.copy()
    random.Random(seed).shuffle(large_ones_to_grab)
    nums = large_ones_to_grab[:num_big]
    return nums

def get_small_ones(num_small: int, seed: int = random.randint(1, 1000)):
    if num_small < 2:
        print("Too little small")
    if num_small > 6:
        print("Too many small")
    small_ones_to_grab = small_ones.copy()
    random.Random(seed).shuffle(small_ones_to_grab) 
    nums = small_ones_to_grab[:num_small]
    return nums

def generate_num_small_from_big(num_big: int):
    return 6 - num_big

def gen_target(seed: int = 1000):
    return random.Random(seed).randint(100, 999)

def make_puzzle(num_big: int, seed: int = 1000):
    num_small = generate_num_small_from_big(num_big)
    big_ones = get_big_ones(num_big, seed)
    small_ones = get_small_ones(num_small, seed)
    numbers = big_ones + small_ones 
    target = gen_target(seed)
    return numbers, target

def generate_daily_puzzle():
    # Use today's date to generate a reproducible puzzle
    today = datetime.date.today()
    seed = today.toordinal()
    num_big = random.Random(seed).randint(0,4)
    numbers, target = make_puzzle(num_big, seed) 
    return numbers, target


