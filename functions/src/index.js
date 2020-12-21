// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access Cloud Firestore.
const admin = require('firebase-admin');

const env = process.env.WPA_BE_ENV || 'local_dev';
// process.env.SERVICE_ACCOUNT_CREDENTIALS = "{\r\n  \"type\": \"service_account\",\r\n  \"project_id\": \"wpa-be-app-dev\",\r\n  \"private_key_id\": \"ae54a43459137b04f29995c637f980325f35c48c\",\r\n  \"private_key\": \"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4w9PHB6jCW7n2\\ntjWgUgVlZ7jYSJOsYhclBuRD5eTUHNkllbUQFPz9u\/JMllrnxh+vhF\/4mOXClL+Q\\nubx0osD7ObjUTr1G9AGQjL9cMuIbdntLnqdByZ6vzDPxch3O5KPVT7k6oIVIt\/rU\\nuKxgjhTCNRvuIf7useYX3ae\/IJam+oAaW\/rGskglyv\/1QIYJk0c9mMPqI74+Ljs2\\nDKMKy4ppDdtU5SFLSLCJoEMEgIEqqRqJ4Qua2uWVQ\/ZlstsMg8kTP7tuZnMTwbDl\\nQPEe56wc\/zqQyTCKk1QWQW7r13TQTraGVC8Z7ETucOEZsjO9iYiwj8M+TU1HYuFF\\nNrMptZ5RAgMBAAECggEAHKWmNA2Eta\/Vp0IskeEtu4GHuCcWmGt0BbZqFXnzTwzz\\nASATXP04FZo6sPO+AAIovwSyAaApPZBlHEokBVyHudwDA436zGHATVp5QBEWnCX0\\na27bpXhejYjGg\/jK1N1\/5m6wPD4PtEzsS+efOHBHGS51WGh2d6lnEMu5+skReq2H\\n9ndhM2zk1Pc0xNgDs8N3XPrXN0NAroX6yY2jeGLjZSnKkQ19Rvjg2wz6BzW4TX5o\\nNAEFPPYkiESVgKGnwlukkslXyo43Z0osp4x48MXxLVrk\/uk482md7RzTDBv3sFbm\\n4EdiAsareVunZm82jAGoKcgUL3xz2rasrFB8ftPqzQKBgQDxsBS4UHBDvhtdLR2a\\nY\/qsNvUysZTatWBpLuYBG2CtM\/Kbx\/2q8ACZxfitH6t6hrYF9X0yy9aW1tXHkPlF\\nAaNn5pyXx4\/b2mBgohmunecultXKqVJPTpVT17OHLYBzh2jS0\/FeGf45H6do1MnT\\n1GQoTEq9yZsJNDEbt\/kWz797nQKBgQDDtM\/ON3KNg1D9WIPAY3O0xN2SKcBW2HTN\\nljJUAqTST1J3l28IwItA5XTON1KkRBtyyz5owOyGXH\/WQcQM8a3Mbqc+b2sIiGrR\\nu9Jp7qeFFLzf7UDhaES8iWLTgiBdZ35YD+yDCJ3+M9LEHnjHhu+FRuGdKIt1fqBL\\nEPft+91xRQKBgEyPEoEwOd+7oL9rQy1c7lMPNazRQ+3j9p5bFNDU81LqWbevKlOz\\nov0TESsGFTPC6HYKxZYJq\/gsJZwJ+Gw7kJ+hFYme1Zs3GcCCmNAPhOPlM+P2rvQg\\nWH0untf7Oe1ev33JVXQRl85QkJ9MiIJpjTCWujZUXqATwFqfdHAdbvKhAoGAMKdy\\nBj2IsB\/WcbWgw6K18FoFD8Jre+vCVh4iEvq5SUPJJ8wxIYbk19RzzpS4afg4rrhS\\noq5b3yd97KFbATDQWYOk9oOyo2Nu0weTzxwy74XxUuZj++X1OL4bIKQ4MaB6K6CB\\n1y28QadWncVJl6k3QPYXPwAGc8ZwSVlFmhfEvNUCgYEAj5puYuPWKfcN1CgkRg92\\ntB3Q5K0DeLSrYUeE67yRSqT7lJtLKJXc5Lg8Ot8JVpVnQFzwZxzXVoLCSWMOFOqx\\nfueEpAT2H1RU6hLDLImF6vtIEXDWUBEu5mlZdHS2nUMXfcs2Tpl0MCambBr9SGfZ\\ndtQVU2kOl72z\/FU8M+nEBOk=\\n-----END PRIVATE KEY-----\\n\",\r\n  \"client_email\": \"firebase-adminsdk-h5m8f@wpa-be-app-dev.iam.gserviceaccount.com\",\r\n  \"client_id\": \"114701514290140985608\",\r\n  \"auth_uri\": \"https:\/\/accounts.google.com\/o\/oauth2\/auth\",\r\n  \"token_uri\": \"https:\/\/oauth2.googleapis.com\/token\",\r\n  \"auth_provider_x509_cert_url\": \"https:\/\/www.googleapis.com\/oauth2\/v1\/certs\",\r\n  \"client_x509_cert_url\": \"https:\/\/www.googleapis.com\/robot\/v1\/metadata\/x509\/firebase-adminsdk-h5m8f%40wpa-be-app-dev.iam.gserviceaccount.com\"\r\n}";
console.log('>>>>>>>>');
console.log(process.env.SERVICE_ACCOUNT_CREDENTIALS);

const config = require("./config/config").getConfig(env);

admin.initializeApp({ credential: admin.credential.cert(config.serviceAccount) });

const firestore = admin.firestore();
const storage = admin.storage();
const messaging = admin.messaging();

module.exports = {
    firestore,
    storage,
    functions,
    messaging,
};

