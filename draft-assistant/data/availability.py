"""Expected share of the 17-game season a player is available.
Applied directly to EV, so it flows through VOR, the rankings, the printed
boards and the live tool. Deliberately mild — these shift a player a few
spots, they don't bury him.
"""
AVAIL = {
 "Zach Charbonnet":  (0.25,"Torn ACL, opened camp on PUP, no timetable."),
 "Josh Jacobs":      (0.76,"Under NFL review after a May arrest; investigation open, no charges filed."),
 "Chuba Hubbard":    (0.82,"Hamstring, week-to-week, and now behind Brooks."),
 "Luther Burden III":(0.85,"Groin; missed the preseason, Bears expect a slow start."),
 "Trey Benson":      (0.85,"Meniscus surgery, timeline unclear."),
 "Jeremiyah Love":   (0.88,"Ankle, plus a committee Arizona says it won't overload him in."),
 "Puka Nacua":       (0.89,"Under NFL review and dealing with soreness; may miss the Week 1 Australia game."),
 "Mike Evans":       (0.90,"Quad in camp, and he turns 33."),
 "Christian McCaffrey":(0.91,"413 touches last season at 30, with no usable depth behind him."),
 "Malik Nabers":     (0.95,"ACL recovery trending toward Week 1, but the ramp-up is real."),
 "Cam Skattebo":     (0.94,"Back from the leg injury but sharing the top of the depth chart."),
 "Tucker Kraft":     (0.92,"ACL return; may or may not be ready for Week 1."),
 "George Kittle":    (0.90,"Achilles/PUP and a long injury history."),
 "Sam LaPorta":      (0.93,"Week 1 status still uncertain."),
 "Isiah Pacheco":    (0.90,"MCL sprain in camp."),
 "James Conner":     (0.88,"Limited in recovery from foot surgery."),
 "Brandon Aiyuk":    (0.85,"Working back; role not guaranteed."),
 "Rashid Shaheed":   (0.95,"Minor camp issue."),
}
