import fs from 'fs';

// Read employees directly from the JSON file
const employees = JSON.parse(fs.readFileSync('./src/mock/employees.json', 'utf8'));

const users = [
    { id: 'admin', name: 'System Administrator', role: 'superadmin', password: 'godmode', designation: 'IT Support', location: 'HO' },
    { id: 'operations', name: 'Operations Manager', role: 'operations', password: 'opspavan', designation: 'Asset & Ops Head', location: 'Yadgir' },
    { id: 'hr', name: 'HR Manager', role: 'hr', password: 'hrpavan', designation: 'Human Resources Head', location: 'Bangalore' },
    { id: 'finance', name: 'Finance Controller', role: 'finance', password: 'financepavan', designation: 'Finance Controller', location: 'Bangalore' },
    { id: 'director', name: 'Executive Director', role: 'director', password: 'edpavan', designation: 'Executive Director', location: 'HO' }
];

employees.forEach(emp => {
    const idNumber = emp.id.split('/').pop();
    const firstFive = emp.name.substring(0, 5);
    
    // Automatically assign the 'manager' role to people whose designation implies they manage a program
    let role = 'employee';
    const desig = (emp.designation || '').toLowerCase();
    
    if (desig.includes('manager') || desig.includes('lead') || desig.includes('head') || desig.includes('director') || desig.includes('coordinator')) {
        role = 'manager';
    }

    users.push({
        id: emp.id, 
        name: emp.name, 
        role: role,
        password: idNumber + firstFive,
        designation: emp.designation || 'N/A', 
        location: emp.location || 'N/A'
    });
});

const csvHeader = 'ID,Name,Role,Password,Designation,Location\n';
const csvRows = users.map(u => `"${u.id}","${u.name}","${u.role}","${u.password}","${u.designation}","${u.location}"`).join('\n');

fs.writeFileSync('./login_credentials_master.csv', csvHeader + csvRows);
console.log('Successfully created single master CSV file with ' + users.length + ' users.');
