Deploy проекта
1. .env с ключами доступа
```bash
AWS_ACCESS_KEY_ID='YOUR_ACCESS_KEY'
AWS_SECRET_ACCESS_KEY='YOUR_SECRET_KEY'
```

2. Установка AWS CLI
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

3. chmod +x deploy.sh
4. Запуск скрипта
```bash
./deploy.sh
./deploy.sh --clean
npm run deploy
npm run deploy:clean
```
