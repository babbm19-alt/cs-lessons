# Turtle Arcade - Levels 1 to 4 only (the assignment)
# TEACHER SAMPLE - do not put this on the public site
# CSP Unit 1 - Mr. Babb

import turtle

# ---------------- LEVEL 1: open the window ----------------
screen = turtle.Screen()
screen.title("Turtle Arcade")
screen.bgcolor("midnightblue")

pen = turtle.Turtle()
pen.hideturtle()
pen.color("white")
pen.penup()
pen.goto(0, 250)
pen.write("TURTLE ARCADE", align="center", font=("Arial", 28, "bold"))

# ---------------- LEVEL 2: ask the player ----------------
player = input("Enter your gamertag: ")
shots = int(input("How many shots? "))

pen.goto(0, 215)
pen.write("Player: " + player + "   Shots: " + str(shots),
          align="center", font=("Arial", 14, "normal"))

# ---------------- LEVEL 3: draw the target ----------------
target = turtle.Turtle()
target.hideturtle()
target.speed(0)
target.penup()

# Outer ring - 1 point
target.goto(0, -120)
target.pendown()
target.fillcolor("white")
target.begin_fill()
target.circle(120)
target.end_fill()
target.penup()

# Middle ring - 5 points
target.goto(0, -80)
target.pendown()
target.fillcolor("red")
target.begin_fill()
target.circle(80)
target.end_fill()
target.penup()

# Bullseye - 10 points
target.goto(0, -40)
target.pendown()
target.fillcolor("gold")
target.begin_fill()
target.circle(40)
target.end_fill()
target.penup()

# ---------------- LEVEL 4: make it clickable ----------------
marker = turtle.Turtle()
marker.hideturtle()
marker.penup()

hud = turtle.Turtle()
hud.hideturtle()
hud.color("white")
hud.penup()
hud.goto(0, -260)

score = 0


def shoot(x, y):
    global score
    marker.goto(x, y)
    marker.dot(10, "black")
    distance = marker.distance(0, 0)

    if distance <= 40:
        points = 10
    elif distance <= 80:
        points = 5
    elif distance <= 120:
        points = 1
    else:
        points = 0

    score = score + points
    hud.clear()
    hud.write("Score: " + str(score), align="center", font=("Arial", 16, "bold"))


screen.onscreenclick(shoot)
turtle.done()
