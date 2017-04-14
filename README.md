前置作業
- ```openssl req -new -newkey rsa:4096 -days 3650 -nodes -x509 -subj "/C=AU/ST=Some-State/O=Internet Widgits Pty Ltd" -keyout ./rsa/id_rsa -out ./rsa/id_rsa.pub```

- ```cat ./rsa/id_rsa ./rsa/id_rsa.pub > ./rsa/private_combined```

