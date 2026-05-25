const fs = require('fs');

const rawInput = `Adele Dora Isaacson Wahlang
(#Kalike/EMP/272)

Agey George
(#Kalike/EMP/292)

Allauddin
(#Kalike/EMP/59)

Amaresh
(#Kalike/EMP/245)

Ambarish
(#Kalike/EMP/217)

Ananda R
(#Kalike/EMP/185)

Anil singh
(#Kalike/EMP/265)

Anitha A
(#Kalike/EMP/80)

Anjalappa
(#Kalike/EMP/237)

Anjanayya
(#Kalike/EMP/114)

Anjaneya Marigoudra
(#Kalike/EMP/253)

Anuradha Deshetty
(#Kalike/EMP/219)

Arunkumar D
(#Kalike/EMP/259)

Arunkumar Swamy
(#Kalike/EMP/230)

Ashajyothi Kotlo
(#Kalike/EMP/07)

Ashish praynord.A
(#Kalike/EMP/277)

Ashok
(#Kalike/EMP/94)

Ashok G
(#Kalike/EMP/205)

Ashok Manappa
(#Kalike/EMP/212)

Ashwinirani
(#Kalike/EMP/211)

Badariphylla Chyne
(#Kalike/EMP/283)

Banrilin Kshiar
(#Kalike/EMP/273)

Basamma N
(#Kalike/EMP/288)

Basavaraj Hadimani
(#Kalike/EMP/222)

Basavaraj Hosamani
(#Kalike/EMP/250)

Basavaraj Nagannavar
(#Kalike/EMP/241)

Bashusab K Sulekal
(#Kalike/EMP/121)

Chitkalamba N
(#Kalike/EMP/15)

Devareddy Bana
(#Kalike/EMP/08)

Dhanaraj Chittapur
(#Kalike/EMP/50)

Geeta
(#Kalike/EMP/294)

Girish Harakamani
(#Kalike/EMP/00B)

Girisha R
(#Kalike/EMP/19)

Hanamanta Akki
(#Kalike/EMP/240)

Hasanrajak
(#Kalike/EMP/231)

Heena Parveen
(#Kalike/EMP/271)

Jagannath K
(#Kalike/EMP/228)

Jayashri Kulkarni
(#Kalike/EMP/252)

Joseph Johnson
(#Kalike/EMP/276)

Josephdeyone Jacobi
(#Kalike/RELI-FTC/05)

Kallappa Talawar
(#Kalike/EMP/183)

Karthika Vijayamani
(#Kalike/RELI-FTC/04)

Kaverappa KP
(#Kalike/EMP/195)

Kiran S Kasareddy
(#Kalike/EMP/269)

Kotresh A Yaradakeri
(#Kalike/EMP/93)

Lachamanna
(#Kalike/EMP/138)

Lakshmi A
(#Kalike/EMP/284)

Lakshmikanta Bilehal
(#Kalike/EMP/242)

Laxmanagoudra
(#Kalike/EMP/251)

Lingappa V
(#Kalike/EMP/29)

Mahesh B Swami
(#Kalike/EMP/223)

Mahesh D K
(#Kalike/EMP/10)

Mahesh Kumar
(#Kalike/EMP/282)

Mallamma S Biradar
(#Kalike/EMP/116)

Mallikarjun N
(#Kalike/EMP/256)

Mallikarjuna M
(#Kalike/EMP/34)

Malteshgouda F.N
(#Kalike/EMP/184)

Manjappa S
(#Kalike/EMP/257)

Manjunath Danni
(#Kalike/EMP/40)

Manjunath V
(#Kalike/EMP/20)

Mareppa N
(#Kalike/EMP/122)

Mounesh K Badiger
(#Kalike/EMP/221)

Mrutyunjay A Bannur
(#Kalike/EMP/215)

Muddesh Basalingappa Hebbal
(#Kalike/EMP/127)

Nancy Khanna
(#Kalike/RELI-FTC/03)

Neelayya
(#Kalike/EMP/23)

Nidhi Qazi
(#Kalike/EMP/267)

Nithya.S
(#Kalike/EMP/279)

Nithyananda Rao. S
(#Kalike/EMP/82)

Noorandappa.G
(#Kalike/EMP/149)

PV Nagaraja
(#Kalike/EMP/204)

Paul Sugumar R
(#Kalike/EMP/207)

Pavankumar Deshetty
(#Kalike/EMP/247)

Pavankumar M Sale
(#Kalike/EMP/200)

Prabhuling Mahantappa Kumbar
(#Kalike/EMP/152)

Prashant Hugar
(#Kalike/EMP/182)

Priyanka Singh
(#Kalike/EMP/266)

Proma Basu Roy
(#Kalike/EMP/264)

Rajavel .S
(#Kalike/EMP/275)

Rajkumar Jagannath
(#Kalike/EMP/236)

Raju
(#Kalike/EMP/235)

Ramachandra Bhat
(#Kalike/EMP/109)

Ramesh Kattimani
(#Kalike/EMP/137)

Rasool sab
(#Kalike/EMP/111)

Ravikumar J
(#Kalike/EMP/214)

Rishikesh Raghavendiran
(#Kalike/EMP/278)

Rohan Chavan
(#Kalike/EMP/268)

Sabanna B
(#Kalike/EMP/287)

Sabanna S Bhosgi
(#Kalike/EMP/293)

Saibabu
(#Kalike/EMP/16)

Sampath Kumar
(#Kalike/EMP/234)

Santhosh I M
(#Kalike/EMP/254)

Savita Mudenoor
(#Kalike/EMP/229)

Savitha L
(#Kalike/EMP/274)

Senthil S
(#Kalike/EMP/281)

Shailaja
(#KALIKE/EMP/295)

Shantabai C
(#Kalike/EMP/286)

Shantagouda B
(#Kalike/EMP/99)

Shantaling s Denek
(#Kalike/EMP/169)

Shanthamma
(#Kalike/EMP/53)

Sharanabasava M
(#Kalike/EMP/150)

Sharanappa
(#Kalike/EMP/166)

Shinjini Chowdhury
(#Kalike/EMP/297)

Shivakumar D
(#Kalike/EMP/00A)

Shivakumar Yadav
(#Kalike/EMP/31)

Shivaputhra
(#Kalike/EMP/129)

Shivaraj Nayak
(#Kalike/EMP/291)

Shwetha B
(#Kalike/EMP/289)

Siddalingareddy
(#Kalike/EMP/126)

Silbarina B Marak
(#Kalike/EMP/299)

Sneha Subramaniam
(#Kalike/RELI-FTC/02)

Solabhayya
(#Kalike/EMP/206)

Sudharani
(#Kalike/EMP/248)

Suraj N Shikhare
(#Kalike/EMP/262)

Suresh S
(#Kalike/EMP/249)

Suryakala.C
(#Kalike/EMP/280)

Tarasingh Jadhav
(#Kalike/EMP/103)

Tayamma
(#Kalike/EMP/105)

Umesh C
(#Kalike/EMP/298)

V Sai Sreekanth
(#Kalike/EMP/255)

Veeresh Ishappa Hanchinal
(#Kalike/EMP/225)

Vineet M Loni
(#Kalike/EMP/148)

Vishwanath
(#Kalike/EMP/167)

Vivek B G
(#Kalike/EMP/263)`;

const lines = rawInput.split('\n').filter(l => l.trim() !== '');
const employees = [];
for (let i = 0; i < lines.length; i += 2) {
    let name = lines[i].trim();
    let id = lines[i+1] ? lines[i+1].trim().replace(/[()]/g, '') : '';
    employees.push({ name, empId: id });
}

const ASSET_MODELS = [
    { n: "Dell Latitude 7420", c: "Equipment", v: 120000 },
    { n: "MacBook Pro M3", c: "Equipment", v: 210000 },
    { n: "ThinkPad X1 Carbon", c: "Equipment", v: 145000 },
    { n: "Cisco Catalyst 9000", c: "Infrastructure", v: 350000 },
    { n: "APC Smart-UPS", c: "Infrastructure", v: 85000 },
    { n: "Herman Miller Aeron", c: "Office", v: 85000 },
    { n: "Samsung Flip 3", c: "Office", v: 110000 },
    { n: "AWS Outpost Rack", c: "Infrastructure", v: 1200000 }
];

const INIT_LOCS = ["Bangalore HQ", "Mumbai Office", "Delhi Hub", "Hyderabad Site", "Chennai DC", "Pune Facility"];
const INIT_PROGS = ["Rural Education Ops", "Health & Sanitation Initiative", "Supply Chain Upgrades", "Digital Literacy Drive"];

let csvData = 'Employee Name,Employee ID,Designation (To be filled),Assigned Asset Name,Asset Category,Asset Value (IND),Location,Program Name\n';

employees.forEach((emp, i) => {
    const model = ASSET_MODELS[i % ASSET_MODELS.length];
    const loc = INIT_LOCS[i % INIT_LOCS.length];
    const prog = INIT_PROGS[i % INIT_PROGS.length];

    csvData += '"' + emp.name + '","' + emp.empId + '","","' + model.n + '","' + model.c + '",' + model.v + ',"' + loc + '","' + prog + '"\n';
});

fs.writeFileSync('C:\\Kalike\\Asset\\employee_data_setup.csv', csvData);
console.log('Created employee_data_setup.csv successfully!');
