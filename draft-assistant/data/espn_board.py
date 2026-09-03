# ESPN 2026 PPR Top-300, dated Aug 19 2026. Built for a 10-team league with
# 4 PTS PER PASSING TD. Our league pays 6. This is the board Jason is using.
ESPN = """1 Jahmyr Gibbs|2 Bijan Robinson|3 Ja'Marr Chase|4 Puka Nacua|5 Jaxon Smith-Njigba|
6 Christian McCaffrey|7 Jonathan Taylor|8 Amon-Ra St. Brown|9 CeeDee Lamb|10 De'Von Achane|
11 Justin Jefferson|12 James Cook III|13 Ashton Jeanty|14 Drake London|15 Jeremiyah Love|
16 Rashee Rice|17 Trey McBride|18 Saquon Barkley|19 Derrick Henry|20 Chase Brown|
21 Kenneth Walker|22 Omarion Hampton|23 Breece Hall|24 Brock Bowers|25 Nico Collins|
26 Chris Olave|27 Garrett Wilson|28 A.J. Brown|29 Malik Nabers|30 Josh Jacobs|
31 Javonte Williams|32 George Pickens|33 Tetairoa McMillan|34 Zay Flowers|35 DeVonta Smith|
36 Josh Allen|37 Travis Etienne Jr.|38 Kyren Williams|39 Quinshon Judkins|40 Cam Skattebo|
41 Bucky Irving|42 Emeka Egbuka|43 Davante Adams|44 Ladd McConkey|45 Terry McLaurin|
46 Tee Higgins|47 Jaylen Waddle|48 Rome Odunze|49 Colston Loveland|50 Tyler Warren|
51 Jameson Williams|52 DJ Moore|53 Luther Burden III|54 Carnell Tate|55 Jayden Daniels|
56 Lamar Jackson|57 Drake Maye|58 Jalen Hurts|59 Bhayshul Tuten|60 D'Andre Swift|
61 David Montgomery|62 Jadarian Price|63 TreVeyon Henderson|64 Rhamondre Stevenson|65 Courtland Sutton|
66 Michael Pittman Jr.|67 Marvin Harrison Jr.|68 DK Metcalf|69 Parker Washington|70 Alec Pierce|
71 Kyle Pitts Sr.|72 Harold Fannin Jr.|73 Sam LaPorta|74 Joe Burrow|75 Jaxson Dart|
76 Mike Evans|77 Christian Watson|78 Matthew Golden|79 Michael Wilson|80 Brian Thomas Jr.|
81 Jakobi Meyers|82 Trevor Lawrence|83 Dak Prescott|84 Bo Nix|85 Brock Purdy|
86 Matthew Stafford|87 Caleb Williams|88 Wan'Dale Robinson|89 Jordan Addison|90 Khalil Shakir|
91 Jayden Reed|92 Xavier Worthy|93 Justin Herbert|94 Patrick Mahomes|95 Jaylen Warren|
96 Rico Dowdle|97 Tony Pollard|98 Kenny Gainwell|99 Jonathon Brooks|100 Chuba Hubbard|
101 Tucker Kraft|102 George Kittle|103 Dallas Goedert|104 Travis Kelce|105 J.K. Dobbins|
106 Kyle Monangai|107 Jacory Croskey-Merritt|108 Rachaad White|109 Jake Ferguson|110 Mark Andrews|
111 T.J. Hockenson|112 Quentin Johnston|113 Josh Downs|114 Deebo Samuel Sr.|115 Aaron Jones Sr.|
116 Isaiah Likely|117 Dalton Kincaid|118 Kenyon Sadiq|119 Hunter Henry|120 Jordan Mason|
121 Blake Corum|122 RJ Harvey|123 Woody Marks|124 Stefon Diggs|125 Makai Lemon|
126 KC Concepcion|127 Chris Godwin Jr.|128 Romeo Doubs|129 De'Zhaun Stribling|130 Tank Dell|
131 Jalen Coker|132 Rashid Shaheed|133 Kyler Murray|134 Tyler Shough|135 Jared Goff|
136 Daniel Jones|137 Zach Charbonnet|138 Alvin Kamara|139 Tyjae Spears|140 Chris Rodriguez Jr.|
141 Brian Robinson|142 Tyler Allgeier|143 Denzel Boston|144 Jerry Jeudy|145 Jalen McMillan|
146 Calvin Ridley|147 Caleb Douglas|148 Adonai Mitchell|149 Baker Mayfield|150 Malik Willis|
151 Travis Hunter|152 Jordyn Tyson|153 Tre Tucker|154 Keaton Mitchell|155 Isiah Pacheco|
156 Jonah Coleman|157 Tank Bigsby|158 Ray Davis|159 Terrance Ferguson|160 Juwan Johnson"""
RANK={}
for e in ESPN.replace("\n","").split("|"):
    e=e.strip()
    if not e: continue
    r,n=e.split(" ",1)
    RANK[n.strip()]=int(r)
