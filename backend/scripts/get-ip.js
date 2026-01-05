const http = require('http');

http.get({ 'host': 'api.ipify.org', 'port': 80, 'path': '/' }, function (resp) {
    resp.on('data', function (ip) {
        console.log("\n====================================================");
        console.log("YOUR CURRENT PUBLIC IP ADDRESS IS: " + ip);
        console.log("====================================================\n");
        console.log("INSTRUCTIONS:");
        console.log("1. Log in to MongoDB Atlas (cloud.mongodb.com)");
        console.log("2. Go to 'Network Access' in the left menu.");
        console.log("3. Click 'Add IP Address'.");
        console.log("4. Paste the IP address above: " + ip);
        console.log("5. Click 'Confirm' and wait 60 seconds.");
        console.log("6. Restart your backend server (node server.js).");
        console.log("====================================================\n");
    });
});
