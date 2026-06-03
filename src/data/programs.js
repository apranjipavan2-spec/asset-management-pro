// Canonical Kalike program list with annual-report values.
// Source: Kalike 2024-25 Annual Report (PDF, converted via markitdown) + kalike.org URL slugs.
// `id` stays stable — it's the value persisted in users.program.
// Update `stats` and `period` when a new annual report lands.

export const PROGRAMS = [
    {
        id: 'education',
        label: 'Primary Education (Phase 2)',
        short: 'Education',
        donor: 'Titan Foundation / Tata Trusts',
        region: 'Yadgir & Koppal districts, Karnataka',
        period: '2024-25',
        description: 'FLN, library, remedial-learning and SDMC strengthening across 657 target schools in Koppal, Kushtagi and Yadgir blocks (Sep 2022 – May 2025).',
        stats: {
            beneficiaries: 83779,
            beneficiariesLabel: 'students reached (Grades 1-8)',
            keyMetrics: [
                { label: 'Teachers Trained (vs 1,450 target)', value: 2425 },
                { label: 'FLN / Remedial Schools', value: 647 },
                { label: 'Functional Libraries', value: 144 },
                { label: 'FLN Achievement (Gr 3-5)', value: '79%' }
            ]
        }
    },
    {
        id: 'ecd',
        label: 'Early Childhood Care & Education (ECCE)',
        short: 'ECCE',
        donor: 'KKRDB / DWCD / UNICEF / Tata Trusts / HT Parekh Foundation',
        region: 'Kalyana Karnataka (7 districts) + Meghalaya (Ribhoi & East Garo Hills)',
        period: '2024-25',
        description: 'Phase-5 ECCE training, "Atadondige Kalike" curriculum, model AWCs, UNICEF "Hello Poshakare" responsive caregiving and expansion to Meghalaya.',
        stats: {
            beneficiaries: 13332,
            beneficiariesLabel: 'Anganwadi Centres covered',
            keyMetrics: [
                { label: 'AWWs Trained (Phase 5)', value: 1366 },
                { label: 'AWHs Trained', value: 866 },
                { label: 'Parents Engaged (meetings)', value: 23485 },
                { label: 'School Readiness Score', value: '69%' }
            ]
        }
    },
    {
        id: 'tksp',
        label: 'Titan – Kanya Sampoorna 2.0',
        short: 'KSP 2.0',
        donor: 'Titan Company Limited (CSR)',
        region: 'Yadgir Block (50 villages, expanded from 20)',
        period: '2024-25',
        description: 'Foundational, secondary and hostel-level interventions for girl children — FLN, libraries, life skills, vocational training and digital learning across 50 schools and 16 hostels.',
        stats: {
            beneficiaries: 10453,
            beneficiariesLabel: 'secondary school students (5,511 girls)',
            keyMetrics: [
                { label: 'NaliKali Teacher Trainings (vs 100)', value: 113 },
                { label: 'Library Reach (children)', value: 7262 },
                { label: 'High Schools w/ LSE', value: 42 },
                { label: 'Hostels Supported', value: 16 }
            ]
        }
    },
    {
        id: 'tn-girls',
        label: 'Tamil Nadu Girls Education',
        short: 'TN Girls',
        donor: 'Titan Company / Namma Ooru Namma School Foundation',
        region: 'Cuddalore & Tiruvannamalai districts, Tamil Nadu',
        period: 'Dec 2024 – ongoing',
        description: 'Kanya Program in 8 KGBV schools and 2 higher-secondary schools: STEM, ICT, literacy, life-skills and infrastructure upgrades.',
        stats: {
            beneficiaries: 4935,
            beneficiariesLabel: 'girls reached',
            keyMetrics: [
                { label: 'KGBV Schools', value: 8 },
                { label: 'Higher Secondary Schools', value: 2 },
                { label: 'Mindspark App Logins', value: 1919 },
                { label: 'Parents Engaged (SMC)', value: 252 }
            ]
        }
    },
    {
        id: 'gp-libraries',
        label: 'Improving Gram Panchayat Libraries',
        short: 'GP Libraries',
        donor: 'HT Parekh Foundation (HTPF)',
        region: 'Koppal & Yadgir districts, Karnataka',
        period: 'Jul 2024 – Dec 2025',
        description: 'Revitalising 227 GP libraries via librarian capacity-building, 45,000 new books, smart TVs / computers and community engagement.',
        stats: {
            beneficiaries: 38000,
            beneficiariesLabel: 'community members (children, youth, adults)',
            keyMetrics: [
                { label: 'Libraries Covered (60 int. + 167 ext.)', value: 227 },
                { label: 'Librarians Trained (course audit)', value: 60 },
                { label: 'New Books Added', value: 45000 },
                { label: 'Digital Devices Installed', value: 52 }
            ]
        }
    },
    {
        id: 'wash',
        label: 'Water, Sanitation & Hygiene',
        short: 'WASH',
        donor: 'Tata Trusts / TESCO',
        region: 'Yadgir, Kalaburagi & Koppal districts (60 villages + 140 villages + 55 schools)',
        period: '2024-25 (project Aug 2023 – Jul 2026)',
        description: 'Community-managed water security: storage structures, borewell recharge, farm ponds, WASH in schools and behaviour-change communication.',
        stats: {
            beneficiaries: 4115,
            beneficiariesLabel: 'households benefited via water security (cumulative)',
            keyMetrics: [
                { label: 'Water Storage Created (m³)', value: 153213 },
                { label: 'Borewell Recharge (vs 45)', value: 83 },
                { label: 'Farm Ponds Built (vs 60)', value: 69 },
                { label: 'Schools w/ WASH Units', value: 55 }
            ]
        }
    },
    {
        id: 'csa',
        label: 'Climate Smart Agriculture',
        short: 'CSA',
        donor: 'Tata Trusts',
        region: '60+ villages, Yadgir district',
        period: '2024-25',
        description: 'Cotton & pulse demo plots, climate-resilient PoPs, Moringa orchards, fruit-based cropping, CISM solar pumps and FPGs.',
        stats: {
            beneficiaries: 5890,
            beneficiariesLabel: 'cotton farmers trained',
            keyMetrics: [
                { label: 'Cotton Demo Plots (30 villages)', value: 75 },
                { label: 'Moringa Farmers (Pilot)', value: 200 },
                { label: 'Fruit-based Demo Plots', value: 61 },
                { label: 'CSIM Solar Units', value: 127 }
            ]
        }
    },
    {
        id: 'agri-next',
        label: 'Project Agri Next',
        short: 'Agri Next',
        donor: 'TESCO (CSR)',
        region: 'Yadgir district (54 villages)',
        period: '2024-25',
        description: 'Multi-layered livelihood — low-cost PoPs, goatery, poultry, fruit-based systems, moringa, CISM and FPGs/SHGs for 5,697 farmers.',
        stats: {
            beneficiaries: 5697,
            beneficiariesLabel: 'farmers covered (vs 5,000 target)',
            keyMetrics: [
                { label: 'Villages (vs 50 target)', value: 54 },
                { label: 'Demonstration Plots', value: 75 },
                { label: 'FPGs + SHGs', value: 107 },
                { label: 'Moringa Orchards', value: 121 }
            ]
        }
    },
    {
        id: 'lambani',
        label: 'Lambani Women Microenterprise',
        short: 'Lambani',
        donor: 'Tata Trusts / TITAN / TESCO / VCF / Raasleela Textiles',
        region: 'Yadgir (Lambani Tandas)',
        period: '2024-25',
        description: 'Lambani embroidery revival via 5th-batch training, OSOP retail at Yadgir Railway Station, bulk corporate orders and exhibitions across Karnataka.',
        stats: {
            beneficiaries: 40,
            beneficiariesLabel: 'Lambani women empowered (cumulative)',
            keyMetrics: [
                { label: '5th Batch Trained', value: 21 },
                { label: 'Raasleela Bulk Order (₹)', value: 111442 },
                { label: 'OSOP Monthly Avg (₹)', value: 10000 },
                { label: 'Saras Mela Belagavi Sales (₹)', value: 35924 }
            ]
        }
    },
    {
        id: 'micro-enterprise',
        label: 'Women Micro-Enterprises (Pencil/Pen)',
        short: 'Samruddhi',
        donor: 'TITAN',
        region: 'Yadgir (Bomshettihalli Skill Centre)',
        period: '2024-25',
        description: 'Samruddhi SHG produces eco-friendly paper pencils and pens — supplied to Kalike Education, OSOP outlet and corporate clients (TITAN, Quest Alliance, SVYM, École Globale).',
        stats: {
            beneficiaries: 20,
            beneficiariesLabel: 'women in Samruddhi SHG',
            keyMetrics: [
                { label: 'Pencils & Pens Sold', value: 55820 },
                { label: 'Education Order (units)', value: 46930 },
                { label: 'OSOP Retail Units', value: 1000 },
                { label: 'White-label Boxes (Swadeshi)', value: 300 }
            ]
        }
    },
    {
        id: 'e3-skill',
        label: 'E3 Skill Development (Tiruppur)',
        short: 'E3 Skill',
        donor: 'TITAN',
        region: 'Tiruppur, Tamil Nadu (Vadugapalayam)',
        period: '2024-25 (LeAP Centre inaugurated 27 Feb 2025)',
        description: 'Free skill training for women & youth in the textile sector — Special Sewing Machine Operator, Tailoring and Merchandising / Quality Control.',
        stats: {
            beneficiaries: 80,
            beneficiariesLabel: 'enrollments (94% completion)',
            keyMetrics: [
                { label: 'SSMO Trained', value: 49 },
                { label: 'SSMO Placed (75%)', value: 21 },
                { label: 'Merchandising Trained', value: 26 },
                { label: 'Tailoring Batches', value: 2 }
            ]
        }
    },
    {
        id: 'crs',
        label: 'Community Radio – Kalike Dhwani 90.3 FM',
        short: 'CRS',
        donor: 'Tata Trusts',
        region: 'Yadgir district',
        period: '2024-25',
        description: 'Local-language community radio for education, nutrition, agriculture and government scheme awareness — also via Kalike Dhwani App for wider reach.',
        stats: {
            beneficiaries: 1625,
            beneficiariesLabel: 'hours of programming aired',
            keyMetrics: [
                { label: 'Contents Broadcast', value: 475 },
                { label: 'Awareness Events', value: 88 },
                { label: 'Feedback Meetings', value: 43 },
                { label: 'Modes', value: 'FM + App' }
            ]
        }
    }
];

export const PROGRAM_BY_ID = Object.fromEntries(PROGRAMS.map(p => [p.id, p]));

export function programLabel(id) {
    return PROGRAM_BY_ID[id]?.label || id || '—';
}

export function programStats(id) {
    return PROGRAM_BY_ID[id]?.stats || null;
}
