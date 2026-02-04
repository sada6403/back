const xlsx = require('xlsx');
const path = require('path');

// Headers
const headers = ["Name", "Email", "Phone", "Role", "Branch", "Salary"];

const data = [
    {
        "Name": "Tester One",
        "Email": "test1@example.com",
        "Phone": "0771111111",
        "Role": "Branch Manager",
        "Branch": "Colombo",
        "Salary": 100000
    },
    {
        "Name": "Tester Two",
        "Email": "test2@example.com",
        "Phone": "0772222222",
        "Role": "Branch Manager",
        "Branch": "Colony", // Should trigger collision handling (CO -> COL)
        "Salary": 100000
    },
    {
        "Name": "Tester Three",
        "Email": "test3@example.com",
        "Phone": "0773333333",
        "Role": "IT Sector",
        "Branch": "Head Office",
        "Manual ID": "IT-HO-999", // Manual ID check
        "Salary": 150000
    }
];

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(data);
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
xlsx.writeFile(wb, '../Advanced_Test.xlsx');

console.log("Created Advanced_Test.xlsx");
