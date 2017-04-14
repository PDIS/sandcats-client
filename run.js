var request = require('request');
var config = require('./config.json');
var keygen = require('ssh-keygen');
var fs = require('fs');
var forge = require('node-forge');
var exec = require('child_process').execSync;
var three_days = 1000 * 60 * 60 * 24 * 3

function RSA_KEY_GENERATION() {
    keygen_cmd = 'openssl req -new -newkey rsa:4096 -days 3650 ' +
        '-nodes -x509 -subj "/C=AU/ST=Some-State/O=Internet Widgits Pty Ltd" -keyout ' +
        config.path_id_rsa + ' -out ' + config.path_id_rsa_pub
    exec(keygen_cmd)

    combine_cmd = 'cat ' + config.path_id_rsa + ' ' + config.path_id_rsa_pub + '>' + config.path_private_combine
    exec(combine_cmd)
}

function REGISTER_SANDCATS_DOMAIN() {
    var post_options = {
        uri: 'https://sandcats.io/register',
        method: 'POST',
        headers: {
            'Accept': 'text/plain',
            'X-Sand': 'cats'
        },
        form: {
            'rawHostname': config.domain_name,
            'email': config.domain_contact_email
        },
        agentOptions: {
            cert: fs.readFileSync(config.path_private_combine),
            key: fs.readFileSync(config.path_id_rsa)
        }
    };

    request(post_options,
        function(error, response, body) {
            console.log('error:', error); // Print the error if one occurred
            console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            console.log('body:', body); // Print the HTML for the Google homepage.
        }
    );
}

function CSR_FILE_GENERATION() {
    csrgen_cmd = 'openssl req -nodes -newkey rsa:4096 -subj "/CN=*.' + config.domain_name + '.sandcats.io/" -keyout 0 -out 0.csr'
    console.log(csrgen_cmd);
    exec(csrgen_cmd);
}

function GET_SANDCATS_CERT() {
    var post_options = {
        uri: 'https://sandcats.io/getcertificate',
        method: 'POST',
        headers: {
            'Accept': 'text/plain',
            'X-Sand': 'cats'
        },
        form: {
            'rawHostname': config.domain_name,
            'certificateSigningRequest': fs.readFileSync("0.csr").toString()
        },
        agentOptions: {
            cert: fs.readFileSync(config.path_private_combine),
            key: fs.readFileSync(config.path_id_rsa)
        }
    };


    request(post_options,
        function(error, response, body) {
            if (error || response.statusCode !== 200) {
                console.log('error:', error); // Print the error if one occurred
                console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                console.log('body:', body); // Print the HTML for the Google homepage.
            } else if (response && response.statusCode === 200) {
                SAVE_HTTPS_CERT_FILE(JSON.parse(body));
            }
        }
    );
}

function SAVE_HTTPS_CERT_FILE(certJSON) {
    certFile = certJSON.cert + "\r\n" + certJSON.ca[0] + "\r\n" + certJSON.ca[1];
    fs.writeFileSync(config.path_https_crt, certFile)
    keyFile = fs.readFileSync('0').toString();
    fs.writeFileSync(config.path_https_key, keyFile)
    fs.unlinkSync('0')
    fs.unlink('0.csr')
    console.log("GET CERTIFICATE!!")
}

action = process.argv[2]

switch (action) {

    case 'init':
        RSA_KEY_GENERATION()
        REGISTER_SANDCATS_DOMAIN()
        CSR_FILE_GENERATION()
        GET_SANDCATS_CERT()
        break

    case 'update':
        cert = fs.readFileSync(config.path_https_crt)
        left_time = forge.pki.certificateFromPem(cert).validity.notAfter - new Date()
        if (left_time < three_days) {
            CSR_FILE_GENERATION()
            GET_SANDCATS_CERT()
        } else {
            console.log("Is more than three days away")
        }
        break

    default:
        console.log(" init      - Generate new RSA key pair for register sandcats domain, and get HTTPS certificate ")
        console.log(" update    - Update HTTPS certificate ")

}