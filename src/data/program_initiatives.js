// Per-program initiatives, achievements, partners and reach metrics.
// Source: Kalike 2024-25 Annual Report (markitdown extraction).
// Keep keyed by the same `id` as src/data/programs.js so the two are joinable.

export const PROGRAM_INITIATIVES = {
    education: {
        tagline: 'Phase 2 — FLN, Libraries & SDMC strengthening across 647 schools',
        reach: {
            districts: 2,
            blocks: 3,
            villages: null,
            sites: 647,
            sitesLabel: 'schools (FLN / Remedial)'
        },
        partners: ['Titan Foundation', 'Tata Trusts', 'Dept. of Education'],
        kpis: [
            { label: 'Students Reached (Gr 1-8)', value: 83779, icon: 'school', color: 'emerald' },
            { label: 'Teachers Trained (167% target)', value: 2425, icon: 'cast_for_education', color: 'blue' },
            { label: 'FLN / Remedial Schools', value: 647, icon: 'menu_book', color: 'amber' },
            { label: 'Community Libraries Supported', value: 227, icon: 'local_library', color: 'purple' },
            { label: 'Library Teachers Trained', value: 277, icon: 'auto_stories', color: 'rose' },
            { label: 'FLN Achievement (Gr 3-5)', value: '79%', icon: 'verified', color: 'cyan' }
        ],
        initiatives: [
            {
                title: 'Foundational Literacy & Numeracy (FLN)',
                status: 'active',
                progress: 98,
                description: 'Nali-Kali teacher training across Koppal, Kushtagi and Yadgir; model centres established with print-rich classrooms and oral-language development.',
                achievements: [
                    '1,663 Nali-Kali teacher training sessions conducted',
                    '27 Master Resource Persons trained at state-level workshops',
                    'Model Nali-Kali Centres established with print-rich classrooms',
                    '381 Head Teacher Trainings (vs 300 target)'
                ]
            },
            {
                title: 'Learning Improvement Program (LIP)',
                status: 'active',
                progress: 95,
                description: 'Grades 3-5 remedial: baseline → endline tracking with individual scorecards and community engagement.',
                achievements: [
                    '3,725 students selected from 5,960 baseline-tested',
                    'Endline assessment covered 3,561 students in 146 schools',
                    '800+ parents engaged through parent meetings'
                ]
            },
            {
                title: 'Library & Community Engagement',
                status: 'active',
                progress: 92,
                description: 'Read-aloud sessions, book talks, storytelling and exposure visits across 227 community libraries.',
                achievements: [
                    '227 community libraries supported (vs 75 planned)',
                    '277 library teachers trained',
                    'Stationery & learning aids distributed to all intensive schools'
                ]
            },
            {
                title: 'SDMC Strengthening',
                status: 'active',
                progress: 87,
                description: 'School Development & Monitoring Committees capacitated for active school governance.',
                achievements: [
                    '260 SDMCs received capacity-building training',
                    '134 of 150 SMCs functional (89%)',
                    'Core governance groups formed in 75 locations'
                ]
            }
        ]
    },

    ecd: {
        tagline: '13,332 Anganwadi Centres across 7 KK districts + Meghalaya expansion',
        reach: {
            districts: 7,
            blocks: null,
            villages: 600,
            sites: 13332,
            sitesLabel: 'Anganwadi Centres'
        },
        partners: ['KKRDB', 'DWCD', 'UNICEF', 'Tata Trusts', 'HT Parekh Foundation', 'Dost'],
        kpis: [
            { label: 'Anganwadi Centres', value: 13332, icon: 'home_work', color: 'emerald' },
            { label: 'AWWs Trained (Phase 5)', value: 1366, icon: 'school', color: 'blue' },
            { label: 'AWHs Trained', value: 866, icon: 'group', color: 'amber' },
            { label: 'Parents Engaged (meetings)', value: 23485, icon: 'family_restroom', color: 'purple' },
            { label: 'Balamela Events', value: 72, icon: 'celebration', color: 'rose' },
            { label: 'School Readiness Score', value: '69%', icon: 'verified', color: 'cyan' }
        ],
        initiatives: [
            {
                title: 'ECCE Phase 5 Capacity Building',
                status: 'active',
                progress: 85,
                description: 'Decentralised circle-level training for AWWs/AWHs on play-based, all-round development.',
                achievements: [
                    '1,366 AWWs completed Phase-5 training',
                    '866 AWHs completed Phase-2 training; 117 on PSE Observation Tool',
                    '638 individual + 397 joint visits with ICDS staff',
                    '337 district-level + 436 block-level review meetings'
                ]
            },
            {
                title: '"Atadondige Kalike" Curriculum',
                status: 'active',
                progress: 70,
                description: 'Two major workshops (Apr 2024 and Feb 2025) to refine emergent literacy, pre-math and language manuals.',
                achievements: [
                    'Curriculum review workshops held with KKRDB',
                    'Activity design and feasibility improved across all districts',
                    '50% AWCs scored 70%+ on AWC profile and PSE observation'
                ]
            },
            {
                title: '"Hello Poshakare" — UNICEF Partnership',
                status: 'pilot',
                progress: 40,
                description: 'Responsive caregiving program with DWCD, UNICEF and Dost in Koppala and Vijayanagara.',
                achievements: [
                    '44 supervisors trained; 6 staff recruited',
                    'Baseline survey with 1,209 caregivers completed',
                    'Field-oriented training sessions conducted with parents'
                ]
            },
            {
                title: 'Meghalaya Expansion',
                status: 'pilot',
                progress: 25,
                description: 'MoU-based technical assistance to Ribhoi & East Garo Hills for curriculum & action planning.',
                achievements: [
                    'MoU signed for ECE curriculum design',
                    'Resource collation and action planning underway',
                    '5-day training delivered to CSPC Gujarat on monitoring & pedagogy'
                ]
            }
        ]
    },

    tksp: {
        tagline: 'KSP 2.0 — 50 villages, 42 high schools and 16 girls\u2019 hostels in Yadgir',
        reach: {
            districts: 1,
            blocks: 1,
            villages: 50,
            sites: 50,
            sitesLabel: 'schools (intervention)'
        },
        partners: ['Titan Company Limited', 'Tata Trusts', 'IIFM Bhopal'],
        kpis: [
            { label: 'Children Benefited', value: 5052, icon: 'groups', color: 'emerald' },
            { label: 'Library Reach (children)', value: 7262, icon: 'menu_book', color: 'blue' },
            { label: 'Secondary School Students', value: 10453, icon: 'school', color: 'amber' },
            { label: 'NaliKali Teacher Trainings', value: 113, icon: 'cast_for_education', color: 'purple' },
            { label: 'Hostels Supported (out of 17)', value: 16, icon: 'apartment', color: 'rose' },
            { label: 'LIP Children Reached', value: 1183, icon: 'auto_stories', color: 'cyan' }
        ],
        initiatives: [
            {
                title: 'Foundational Literacy & Numeracy (Nali-Kali)',
                status: 'active',
                progress: 95,
                description: '50 schools, 113 Nali-Kali centres and 113 teachers — exceeding the 100 each planned.',
                achievements: [
                    '5,052 children (2,656 girls, 2,396 boys) reached against 4,500 target',
                    'Endline assessments completed across all intensive schools',
                    'Material support delivered to all 50 schools'
                ]
            },
            {
                title: 'Library & LIP Remedial',
                status: 'active',
                progress: 92,
                description: '50 LIP centres, 50 animators, 50 libraries and 50 library point teachers across the block.',
                achievements: [
                    '7,262 children reached via library activities (vs 6,250 plan)',
                    '1,183 children received LIP remedial support',
                    'Workbooks and stationery distributed to all 50 schools'
                ]
            },
            {
                title: 'Secondary Schools & Life Skill Education',
                status: 'active',
                progress: 100,
                description: '42 high schools (vs 40 planned) with LSE for Grade 8-9, career guidance for Grade 10 and digital classes.',
                achievements: [
                    '10,453 secondary students reached (5,511 girls, 4,942 boys)',
                    'Career-planning pilots in 17 schools',
                    'Vocational sessions (horticulture, kitchen gardening) in 18 schools',
                    'Two model schools conceptualized via exposure visits to Dakshina Kannada'
                ]
            },
            {
                title: 'Girls\u2019 Hostel Interventions',
                status: 'active',
                progress: 94,
                description: '10 pre-matric + 6 post-matric hostels — LSE, Asha modules, spoken English, digital classes and competitive exam prep.',
                achievements: [
                    '854 hostel girls supported (vs 800 plan)',
                    'Endline: 51.6% improvement in math, 60.4% in science',
                    'External impact assessment by IIFM Bhopal validated effectiveness'
                ]
            }
        ]
    },

    'tn-girls': {
        tagline: '8 KGBVs + 2 Higher Secondary schools in Cuddalore & Tiruvannamalai',
        reach: {
            districts: 2,
            blocks: null,
            villages: null,
            sites: 10,
            sitesLabel: 'schools (KGBV + HS)'
        },
        partners: ['Titan Company Limited', 'Namma Ooru Namma School Foundation', 'TN State Authorities'],
        kpis: [
            { label: 'Girls Reached', value: 4935, icon: 'female', color: 'emerald' },
            { label: 'Coaching Sessions', value: 1072, icon: 'cast_for_education', color: 'blue' },
            { label: 'Mindspark Logins', value: 1919, icon: 'computer', color: 'amber' },
            { label: 'Exam Writing Kits', value: 1764, icon: 'edit_note', color: 'purple' },
            { label: 'Hygiene Kits Distributed', value: 674, icon: 'health_and_safety', color: 'rose' },
            { label: 'Parents Engaged (SMC)', value: 252, icon: 'family_restroom', color: 'cyan' }
        ],
        initiatives: [
            {
                title: 'Capacity Building (Teachers)',
                status: 'active',
                progress: 80,
                description: 'District Inception Workshop, ICT Orientation, STEM training and literacy workshops for KGBV teachers.',
                achievements: [
                    '31 participants in District Inception Workshop',
                    '20 STEM teachers trained on math/science kits',
                    '20 ICT teachers trained for digital education',
                    '8 SMC meetings engaging 252 parents'
                ]
            },
            {
                title: 'Academic & Onsite Support',
                status: 'active',
                progress: 88,
                description: 'Structured coaching for Grades 10-12 and STEM/literacy sessions across 12 schools.',
                achievements: [
                    '3,284 students reached through 1,072 sessions',
                    '128 Tamil & English literacy sessions delivered',
                    '131 STEM (math, science) + 21 coding sessions conducted',
                    'Mindspark App deployed with 1,919 girl logins'
                ]
            },
            {
                title: 'Resources & Infrastructure',
                status: 'active',
                progress: 75,
                description: 'Math/science kits, library books, classroom upgrades and ICT lab infrastructure.',
                achievements: [
                    '23 math + 23 science kits and 1,924 worksheets distributed',
                    'Libraries strengthened in 11 schools; NEET guides for HS students',
                    'Classroom, sanitation, handwashing and ICT lab upgrades in 10 schools',
                    'Sports kits supplied to 10 schools; hygiene kits to 674 girls'
                ]
            },
            {
                title: 'Life Skills & Well-being',
                status: 'active',
                progress: 90,
                description: 'Menstrual health, nutrition, emotional management and safety training.',
                achievements: [
                    '1,094 girls trained on menstrual health & nutrition',
                    '505 girls trained on emotional management & safety',
                    '117% awareness improvement post-training',
                    'Art workshops in 3 KGBVs — 151 girls in painting & origami'
                ]
            }
        ]
    },

    'gp-libraries': {
        tagline: '227 GP libraries revitalised across Koppal & Yadgir',
        reach: {
            districts: 2,
            blocks: null,
            villages: 227,
            sites: 227,
            sitesLabel: 'Gram Panchayat libraries'
        },
        partners: ['HT Parekh Foundation', 'RDPR Karnataka', 'Tata Trusts'],
        kpis: [
            { label: 'Libraries Covered', value: 227, icon: 'local_library', color: 'emerald' },
            { label: 'Beneficiary Reach', value: 38000, icon: 'groups', color: 'blue' },
            { label: 'New Books Added', value: 45000, icon: 'menu_book', color: 'amber' },
            { label: 'Digital Devices', value: 52, icon: 'computer', color: 'purple' },
            { label: 'Storytelling Sessions', value: 412, icon: 'record_voice_over', color: 'rose' },
            { label: 'Career Guidance Workshops', value: 132, icon: 'work', color: 'cyan' }
        ],
        initiatives: [
            {
                title: 'Capacity Building for Librarians',
                status: 'active',
                progress: 78,
                description: '8 intensive training batches for 60 librarians plus cluster-based peer learning.',
                achievements: [
                    '60 librarians completed course audit',
                    '38 GP In-charge Librarians trained on reading promotion',
                    '295 librarians across two capacity-building phases',
                    'Library Course piloted for 30 librarians (standardized certification pathway)'
                ]
            },
            {
                title: 'Technology & Resource Upgrades',
                status: 'active',
                progress: 85,
                description: 'Smart TVs, computers, offline content libraries and 45,000 new books.',
                achievements: [
                    '52 devices installed (30 smart TVs + 22 computers)',
                    '45,000 new Kannada/English/Hindi books procured',
                    'Offline educational video libraries created for low-connectivity areas',
                    '56 furniture sets added'
                ]
            },
            {
                title: 'Community Outreach Programming',
                status: 'active',
                progress: 90,
                description: 'Storytelling, career guidance, book exhibitions and quiz competitions.',
                achievements: [
                    '412 storytelling sessions held',
                    '132 career guidance workshops with vocational institute linkages',
                    'District-level Library Day with 122 librarians participating',
                    '489 participants in quarterly review meetings'
                ]
            },
            {
                title: 'Library Utilization Impact',
                status: 'active',
                progress: 82,
                description: 'Daily visits jumped from 5-10 to 25-30+ per library — sharp uptick in regular readers.',
                achievements: [
                    'Beneficiary reach: 17,900 (6-12 yrs), 15,900 (13-18 yrs), 4,200 adults',
                    'Girls\u2019 attendance increased after inclusion-focused activities',
                    'Monitoring visits: 540 intensive + 501 extensive'
                ]
            }
        ]
    },

    wash: {
        tagline: 'Community-managed water security across 60 villages + 140 villages + 55 schools',
        reach: {
            districts: 3,
            blocks: null,
            villages: 200,
            sites: 55,
            sitesLabel: 'schools (WASH)'
        },
        partners: ['Tata Trusts', 'TESCO', 'RDPR Karnataka'],
        kpis: [
            { label: 'Storage Created (m³)', value: 153213, icon: 'water_drop', color: 'emerald' },
            { label: 'Borewell Recharge (vs 45)', value: 83, icon: 'water', color: 'blue' },
            { label: 'Farm Ponds (vs 60)', value: 69, icon: 'water_pump', color: 'amber' },
            { label: 'O&M Trainees', value: 780, icon: 'engineering', color: 'purple' },
            { label: 'Water Sources Tested', value: 222, icon: 'science', color: 'rose' },
            { label: 'Children w/ Hygiene Ed.', value: 3258, icon: 'sanitizer', color: 'cyan' }
        ],
        initiatives: [
            {
                title: 'Water Storage & Conservation',
                status: 'active',
                progress: 73,
                description: 'Check dams, farm ponds, recharge pits and nala deepening/widening.',
                achievements: [
                    '1,53,213 m³ storage created (cumulative)',
                    '7 water harvesting structures completed; expanding to 20',
                    '116,411 m³ nala deepening achieved this year',
                    'Pre-monsoon push drove 50% faster progress; 15 new villages benefiting'
                ]
            },
            {
                title: 'Borewell Recharge & Farm Ponds',
                status: 'active',
                progress: 92,
                description: 'Recharge structures and on-farm storage for groundwater stabilisation.',
                achievements: [
                    '83 borewell recharge structures (vs 45 target)',
                    '69 farm ponds built (vs 60 target)',
                    'Groundwater levels stabilised in 40 villages',
                    '30% increase in Rabi crop cultivation from functional ponds'
                ]
            },
            {
                title: 'Community Engagement & WSSP',
                status: 'active',
                progress: 55,
                description: 'Water Safety Plans, village task forces and capacity-building for committees.',
                achievements: [
                    '33 WSSPs developed; 60 in finalisation (100% coverage)',
                    'Village task forces operational in 50 villages',
                    '90% of committees independently manage budgets after training',
                    '20 training sessions for Water Committees delivered'
                ]
            },
            {
                title: 'WASH in Schools',
                status: 'active',
                progress: 50,
                description: 'WASH unit upgrades, gender-segregated toilets and behaviour change.',
                achievements: [
                    'WASH facilities enhanced in 55 schools',
                    '15 functional WASH units delivered this year (target 30)',
                    'Girl absenteeism dropped 25% in pilot schools',
                    '40% increase in hygiene knowledge retention with new digital IEC kits'
                ]
            }
        ]
    },

    csa: {
        tagline: 'Climate-resilient agriculture across 60+ villages, Yadgir district',
        reach: {
            districts: 1,
            blocks: 2,
            villages: 60,
            sites: 75,
            sitesLabel: 'demonstration plots'
        },
        partners: ['Tata Trusts', 'KVK', 'Animal Husbandry Dept.', 'Girinadu FPCL'],
        kpis: [
            { label: 'Cotton Farmers Trained', value: 5890, icon: 'agriculture', color: 'emerald' },
            { label: 'Cotton Demo Plots', value: 75, icon: 'eco', color: 'blue' },
            { label: 'Moringa Farmers', value: 200, icon: 'park', color: 'amber' },
            { label: 'CSIM Solar Units', value: 127, icon: 'solar_power', color: 'purple' },
            { label: 'FPGs Functional', value: 134, icon: 'groups', color: 'rose' },
            { label: 'Groundnut Farmers Advised', value: 1528, icon: 'spa', color: 'cyan' }
        ],
        initiatives: [
            {
                title: 'Cotton Package of Practices',
                status: 'active',
                progress: 88,
                description: '75 demo plots (1 acre each) across 30 villages with strict POP adherence.',
                achievements: [
                    '5,890 cotton farmers trained on best PoPs',
                    'Inputs: seeds, sticky/pheromone traps, micro-nutrients and IEC materials',
                    '75 demo plots became learning hubs with exposure visits',
                    'No-stubble-burning practice enforced'
                ]
            },
            {
                title: 'Crop Diversification & Moringa',
                status: 'active',
                progress: 75,
                description: 'Moringa orchards, fruit-based cropping and Zaid-season vegetables to layer farmer income.',
                achievements: [
                    '200 farmers identified for 0.5-acre Moringa orchards',
                    '400 samplings distributed per farmer',
                    '61 fruit-based demo plots (mango, lemon, guava) established',
                    'Projected ₹20,000-25,000 additional income per farmer every 6 months'
                ]
            },
            {
                title: 'Climate-Resilience Response (Aug-Sep 2024 Rains)',
                status: 'completed',
                progress: 100,
                description: 'Rapid recovery support for 667 acres damaged by waterlogging and erosion.',
                achievements: [
                    'Village-level sessions on water management and pest control',
                    'Organic fertilizers and foliar sprays distributed',
                    '1,528 groundnut farmers supported with crop monitoring & advisory',
                    'Demo plots showed minimal damage vs surrounding fields'
                ]
            },
            {
                title: 'FPGs & CISM',
                status: 'active',
                progress: 80,
                description: 'Farmer Producer Groups and Community Irrigation Solar Model deployment.',
                achievements: [
                    '50 new FPGs formed this quarter; 134 functional overall',
                    '127 CSIM units covering 500+ farmers',
                    'Girinadu FPCL governance restructured; CEO recruitment in progress',
                    'Krishiyuktha App piloted for digital crop advisory'
                ]
            }
        ]
    },

    'agri-next': {
        tagline: 'Multi-layered livelihoods for 5,697 farmers across 54 villages',
        reach: {
            districts: 1,
            blocks: null,
            villages: 54,
            sites: 75,
            sitesLabel: 'demonstration plots'
        },
        partners: ['TESCO (CSR)', 'KVK', 'IIHR Hesaraghatta', 'GKVK Bangalore'],
        kpis: [
            { label: 'Farmers Covered', value: 5697, icon: 'agriculture', color: 'emerald' },
            { label: 'Horticulture Farmers', value: 622, icon: 'park', color: 'blue' },
            { label: 'FPGs + SHGs', value: 107, icon: 'groups', color: 'amber' },
            { label: 'Moringa Orchards', value: 121, icon: 'spa', color: 'purple' },
            { label: 'Goatery Monitoring Visits', value: 419, icon: 'pets', color: 'rose' },
            { label: 'Poultry Monitoring Visits', value: 445, icon: 'egg', color: 'cyan' }
        ],
        initiatives: [
            {
                title: 'Integrated Farming & Income Layering',
                status: 'active',
                progress: 85,
                description: 'Low-cost PoPs for groundnut, redgram, greengram, watermelon and chilli plus farm-pond / micro-irrigation.',
                achievements: [
                    '75 demo plots established (vs 50 target)',
                    '15 VRPs and 15 functional VICs supporting villages',
                    'Demo plots showed climate-resilient practices with minimal crop loss',
                    'Raised-bed sowing and organic matter applied across plots'
                ]
            },
            {
                title: 'Backyard Poultry',
                status: 'active',
                progress: 90,
                description: 'Salem & crossbred birds for disease-resistant, dual-purpose backyard production.',
                achievements: [
                    '369 direct + 76 indirect farmers supported',
                    'Veterinary care, vaccination & training on feed/health/shed',
                    'Marketing support and IEC materials distributed'
                ]
            },
            {
                title: 'Goatery (Osmanabadi)',
                status: 'active',
                progress: 88,
                description: 'High-kidding, disease-resistant Osmanabadi goats for smallholders.',
                achievements: [
                    '287 direct + 132 indirect farmers benefited',
                    'Vaccinations & capacity-building on fodder, housing, disease',
                    '1,520 animals vaccinated across 736 households (FMD camps)'
                ]
            },
            {
                title: 'Agri-Entrepreneurs Training (GKVK)',
                status: 'completed',
                progress: 100,
                description: '5-day residential program at GKVK Bangalore in 3 batches.',
                achievements: [
                    '38 Agri-Entrepreneurs trained on agri-business & financial planning',
                    'Practical skills: apiculture, mushroom cultivation, nursery management',
                    'Exposure visits to IIHR Hesaraghatta and livestock units',
                    'All participants certified — ready to start/scale agri-enterprises'
                ]
            }
        ]
    },

    lambani: {
        tagline: '40+ Lambani women linked to organised markets via Dharmani Producer Company',
        reach: {
            districts: 1,
            blocks: null,
            villages: null,
            sites: 1,
            sitesLabel: 'OSOP outlet (Yadgir Railway Station)'
        },
        partners: ['Tata Trusts', 'TITAN', 'TESCO', 'VCF', 'Raasleela Textiles', 'Kusuri Mane', 'Swadeshi Kalburgi'],
        kpis: [
            { label: 'Women Empowered (cumulative)', value: 40, icon: 'female', color: 'emerald' },
            { label: '5th Batch Trained', value: 21, icon: 'school', color: 'blue' },
            { label: 'Raasleela Bulk Order (₹)', value: 111442, icon: 'shopping_bag', color: 'amber' },
            { label: 'Saras Mela Belagavi Sales (₹)', value: 35924, icon: 'store', color: 'purple' },
            { label: 'OSOP Avg Monthly Revenue (₹)', value: 10000, icon: 'train', color: 'rose' },
            { label: 'Saras Mela Koppal Sales (₹)', value: 19655, icon: 'storefront', color: 'cyan' }
        ],
        initiatives: [
            {
                title: 'Training & Capacity Building',
                status: 'active',
                progress: 90,
                description: '5th batch training in Lambani embroidery, communication and hygiene.',
                achievements: [
                    '21 women trained in the 5th batch',
                    'Upskilling workshop by Rinshila on finishing quality',
                    'Entrepreneurship Development workshop by FVTRS on financial literacy'
                ]
            },
            {
                title: 'OSOP Retail (Yadgir Railway Station)',
                status: 'active',
                progress: 80,
                description: 'One Station One Product outlet operating since Oct 2023 — affordable products for travellers.',
                achievements: [
                    '₹10,000 average monthly revenue achieved',
                    'Expanded product range to attract travellers',
                    'Maintained consistent sales through year'
                ]
            },
            {
                title: 'Bulk & Corporate Orders',
                status: 'active',
                progress: 95,
                description: 'Premium hand-stitched products with traditional stitches (jaali, minmini, maakhi).',
                achievements: [
                    'Raasleela Textiles, Ahmedabad: ₹1,11,442 in orders completed',
                    'TESCO, TITAN, VCF: corporate bulk orders for laptop sleeves, frames, handbags',
                    'Kusuri Mane Bangalore: ₹14,000+ in retail sales since Sept 2024',
                    'Swadeshi Kalburgi: outlet showcasing Lambani products since Jan 2024'
                ]
            },
            {
                title: 'Exhibitions & Producer Company',
                status: 'active',
                progress: 75,
                description: 'Saras Mela, TITAN Integrity Campus, TESCO Christmas Flea — plus SHG registration as Producer Company.',
                achievements: [
                    'Saras Mela Belagavi: ₹35,924 over 10 days',
                    'Saras Mela Koppal: ₹19,655',
                    'TITAN Integrity Campus: ₹14,350; TESCO Christmas Flea: ₹10,115',
                    'Dharmani SHG registered as Producer Company for scaling'
                ]
            }
        ]
    },

    'micro-enterprise': {
        tagline: 'Samruddhi SHG — eco-friendly pencils & pens from recycled paper',
        reach: {
            districts: 1,
            blocks: null,
            villages: null,
            sites: 1,
            sitesLabel: 'Skill Centre (Bomshettihalli, Yadgir)'
        },
        partners: ['TITAN', 'Greenmate Pencil Sivakasi', 'Swadeshi Kalburgi', 'Quest Alliance', 'SVYM', 'École Globale'],
        kpis: [
            { label: 'Women in Samruddhi SHG', value: 20, icon: 'female', color: 'emerald' },
            { label: 'Pencils & Pens Sold', value: 55820, icon: 'edit', color: 'blue' },
            { label: 'Kalike Education Order', value: 46930, icon: 'school', color: 'amber' },
            { label: 'OSOP Units (Dharmani retail)', value: 1000, icon: 'train', color: 'purple' },
            { label: 'White-label Boxes (Swadeshi)', value: 300, icon: 'inventory_2', color: 'rose' },
            { label: 'Total Sales Share (pencil/pen)', value: '88%', icon: 'trending_up', color: 'cyan' }
        ],
        initiatives: [
            {
                title: 'Enhanced Production & Safety',
                status: 'active',
                progress: 85,
                description: 'Infrastructure upgrades to scale Samruddhi from foundational to a sustainable enterprise.',
                achievements: [
                    'Active exhaust system installed to reduce drying-process heat',
                    'Comprehensive safety kits provided (caps, masks, gloves, aprons, goggles)',
                    'Production safety baseline established'
                ]
            },
            {
                title: 'Knowledge Transfer (Greenmate Sivakasi)',
                status: 'completed',
                progress: 100,
                description: 'Exposure visits to Sivakasi for advanced techniques in production and cost-effective manufacturing.',
                achievements: [
                    'Visits to Greenmate Pencil — leading industry hub',
                    'Advanced techniques in quality and cost-efficient manufacturing learned',
                    'Reliable sourcing established for leads, refills, seed caps and gum'
                ]
            },
            {
                title: 'Market Expansion & Branding',
                status: 'active',
                progress: 80,
                description: 'Custom Samruddhi-branded packaging, new retail tie-ups and corporate B2B pipeline.',
                achievements: [
                    'Custom Samruddhi-branded pencil and pen boxes designed',
                    'New retail outlet via Swadeshi, Kalburgi',
                    'Entrepreneurship Development workshop conducted',
                    '55,820 units sold (88% of total sales)'
                ]
            },
            {
                title: 'Producer-Company Registration',
                status: 'pilot',
                progress: 40,
                description: 'Registration in progress (following Dharmani SHG model) for larger contracts and long-term sustainability.',
                achievements: [
                    '3-day entrepreneurship workshop by FVTRS completed',
                    'Producer-company registration process initiated',
                    'Future plans: corporate B2B + digital marketing'
                ]
            }
        ]
    },

    'e3-skill': {
        tagline: 'TITAN LeAP Centre — skill training for women & youth in Tiruppur textile sector',
        reach: {
            districts: 1,
            blocks: null,
            villages: null,
            sites: 2,
            sitesLabel: 'training centres (Tiruppur)'
        },
        partners: ['TITAN', 'Renuka Knits', 'TEA', 'SITRA Coimbatore', 'LRG College', 'Park\u2019s College', 'TERF\u2019s Academy'],
        kpis: [
            { label: 'Total Enrollments', value: 80, icon: 'how_to_reg', color: 'emerald' },
            { label: 'Completion Rate', value: '94%', icon: 'verified', color: 'blue' },
            { label: 'SSMO Trained', value: 49, icon: 'precision_manufacturing', color: 'amber' },
            { label: 'SSMO Placement Rate', value: '75%', icon: 'work', color: 'purple' },
            { label: 'Merchandising Trained', value: 26, icon: 'inventory', color: 'rose' },
            { label: 'Tailoring Batches', value: 2, icon: 'content_cut', color: 'cyan' }
        ],
        initiatives: [
            {
                title: 'TITAN LeAP Centre, Tiruppur',
                status: 'active',
                progress: 70,
                description: 'Employment-oriented training centre inaugurated 27 Feb 2025.',
                achievements: [
                    'Inaugurated 27 Feb 2025 with TEA, TITAN and Kalike dignitaries',
                    'Industry partnerships established with TEA, SITRA and garment units',
                    'Placement drive initiated with TERF\u2019s Academy'
                ]
            },
            {
                title: 'Special Sewing Machine Operator (SSMO)',
                status: 'active',
                progress: 75,
                description: 'SITRA-certified training on over-lock, flatlock and buttoning machines.',
                achievements: [
                    '49 women trained in SSMO course',
                    '21 women placed (75% placement rate)',
                    'SITRA-Coimbatore certification secured'
                ]
            },
            {
                title: 'Tailoring Centre (Vadugapalayam)',
                status: 'active',
                progress: 60,
                description: 'Collaboration with Renuka Knits — two batches launched.',
                achievements: [
                    'First batch: 28 women trained',
                    'Second batch: 21 women ongoing',
                    'Strong link with garment industry for placements'
                ]
            },
            {
                title: 'Merchandising for Youth',
                status: 'pilot',
                progress: 50,
                description: 'Industry-aligned training for graduates and diploma holders.',
                achievements: [
                    '26 students from LRG and Park\u2019s Colleges trained',
                    'Placements underway via partner network',
                    'Industry demand of 200+ trained personnel per month being addressed'
                ]
            }
        ]
    },

    crs: {
        tagline: 'Kalike Dhwani 90.3 FM — local-language radio + app for wider reach',
        reach: {
            districts: 1,
            blocks: null,
            villages: null,
            sites: 1,
            sitesLabel: 'Community Radio Station'
        },
        partners: ['Tata Trusts', 'Govt. Depts. (Education, Health, Agriculture)'],
        kpis: [
            { label: 'Hours Aired', value: 1625, icon: 'radio', color: 'emerald' },
            { label: 'Contents Broadcast', value: 475, icon: 'queue_music', color: 'blue' },
            { label: 'Awareness Events', value: 88, icon: 'campaign', color: 'amber' },
            { label: 'Feedback Meetings', value: 43, icon: 'forum', color: 'purple' },
            { label: 'Modes', value: 'FM + App', icon: 'devices', color: 'rose' },
            { label: 'Frequency', value: '90.3 FM', icon: 'graphic_eq', color: 'cyan' }
        ],
        initiatives: [
            {
                title: 'Content Creation & Broadcast',
                status: 'active',
                progress: 88,
                description: 'Two modes — recordings with resource persons and solo recordings.',
                achievements: [
                    '475 contents broadcast across two modes',
                    '1,625 hours of programming aired',
                    'Wider reach via Kalike Dhwani 90.4 FM App'
                ]
            },
            {
                title: 'Awareness & Sensitisation Events',
                status: 'active',
                progress: 92,
                description: 'School and community-level events to promote the station and its content.',
                achievements: [
                    '88 awareness & sensitization events conducted',
                    'Events held in schools and across communities',
                    'Branding of "Kalike Dhwani" radio strengthened'
                ]
            },
            {
                title: 'Community Feedback Loops',
                status: 'active',
                progress: 85,
                description: 'Group meetings with youth, women and farmer communities.',
                achievements: [
                    '43 feedback sessions & group meetings held',
                    'Content shaped by community input',
                    'Programming priorities refined through dialogue'
                ]
            },
            {
                title: 'Govt. Convergence',
                status: 'active',
                progress: 75,
                description: 'Tie-ups with government departments for socio-economic awareness.',
                achievements: [
                    'Local-dialect broadcasts preserving regional culture',
                    'Improved public-service awareness across Yadgir',
                    'Contribution to district socio-economic development'
                ]
            }
        ]
    }
};

export function programInitiatives(id) {
    return PROGRAM_INITIATIVES[id] || null;
}
