const http = require('http');

const loginData = JSON.stringify({
    username: 'analyzer@nf.com', // Need a valid analyzer email/userId. Let's try finding one from DB first
    password: 'password123',
    role: 'analyzer'
});

// Since I don't know an analyzer's login off-hand, I'll first query the local DB info script to get an analyzer userId,
// Or better yet, I can just use my local MongoDB connection to the AWS DB to fetch an analyzer's credentials!
