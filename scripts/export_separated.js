import fs from 'fs';
import path from 'path';

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

// Group by Role
const groupedByRole = users.reduce((acc, user) => {
    if (!acc[user.role]) acc[user.role] = [];
    acc[user.role].push(user);
    return acc;
}, {});

// Export to separate CSVs
Object.keys(groupedByRole).forEach(role => {
    const roleUsers = groupedByRole[role];
    const csvHeader = 'ID,Name,Role,Password,Designation,Location\n';
    const csvRows = roleUsers.map(u => `"${u.id}","${u.name}","${u.role}","${u.password}","${u.designation}","${u.location}"`).join('\n');
    
    fs.writeFileSync(`./login_details_${role}.csv`, csvHeader + csvRows);
    console.log(`Created: login_details_${role}.csv with ${roleUsers.length} users.`);
});

console.log('Successfully separated the login details!');
