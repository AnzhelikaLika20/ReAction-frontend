#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BUCKET_NAME="re-action.site"
DIST_DIR="./dist"
ENDPOINT_URL="https://storage.yandexcloud.net"
SECRETS_FILE=".env"

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_success() {
    echo -e "${GREEN} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW} $1${NC}"
}

print_error() {
    echo -e "${RED} $1${NC}"
}

check_dependencies() {
    print_info "Проверка зависимостей..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI не установлен"
        echo "Установите: pip install awscli"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm не установлен"
        exit 1
    fi
    
    print_success "Все зависимости найдены"
}

load_secrets() {
    if [ -f "$SECRETS_FILE" ]; then
        print_info "Загрузка секретов из $SECRETS_FILE"
        set -a
        source "$SECRETS_FILE"
        set +a
    fi
    
    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
        print_error "AWS_ACCESS_KEY_ID и AWS_SECRET_ACCESS_KEY должны быть установлены"
        echo "Создайте файл $SECRETS_FILE или установите переменные окружения"
        echo "Формат .env:"
        echo "AWS_ACCESS_KEY_ID='ваш_ключ'"
        echo "AWS_SECRET_ACCESS_KEY='ваш_секрет'"
        exit 1
    fi
    
    print_success "Секреты загружены"
}

build_project() {
    print_info "Сборка проекта..."
    
    if [ -d "$DIST_DIR" ]; then
        print_warning "Очистка директории $DIST_DIR"
        rm -rf "$DIST_DIR"
    fi
    
    npm ci || npm install
    npm run build
    
    if [ ! -d "$DIST_DIR" ]; then
        print_error "Директория $DIST_DIR не создана после сборки"
        exit 1
    fi
    
    print_success "Сборка завершена"
}

clean_bucket() {
    if [ "$1" == "--clean" ]; then
        print_warning "Это удалит ВСЕ файлы в бакете $BUCKET_NAME"
        read -p "Продолжить? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Очистка бакета..."
            aws s3 rm "s3://$BUCKET_NAME" \
                --endpoint-url "$ENDPOINT_URL" \
                --recursive
            print_success "Бакет очищен"
        else
            print_info "Очистка пропущена"
        fi
    fi
}

deploy() {
    print_info "Деплой фронтенда в s3://$BUCKET_NAME..."
    
    FILE_COUNT=$(find "$DIST_DIR" -type f | wc -l)
    TOTAL_SIZE=$(du -sh "$DIST_DIR" | cut -f1)
    print_info "Файлов для загрузки: $FILE_COUNT ($TOTAL_SIZE)"
    
    print_info "Загрузка статических файлов (кеширование на 1 год)..."
    aws s3 sync "$DIST_DIR" "s3://$BUCKET_NAME" \
        --acl public-read \
        --endpoint-url "$ENDPOINT_URL" \
        --delete \
        --cache-control "public, max-age=31536000, immutable" \
        --exclude "index.html" \
        --exclude "*.json" \
        --exclude "service-worker.js" \
        --exclude "sw.js" \
        --exclude "manifest.json"
    
    print_info "Загрузка index.html и JSON (без кеширования)..."
    aws s3 sync "$DIST_DIR" "s3://$BUCKET_NAME" \
        --acl public-read \
        --endpoint-url "$ENDPOINT_URL" \
        --cache-control "no-cache, no-store, must-revalidate" \
        --exclude "*" \
        --include "index.html" \
        --include "*.json" \
        --include "service-worker.js" \
        --include "sw.js" \
        --include "manifest.json"
    
    print_success "Деплой успешно завершен!"
}

show_url() {
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Сайт доступен по адресу:${NC}"
    echo -e "${BLUE}   https://$BUCKET_NAME${NC}"
    echo -e "${GREEN}Бакет: s3://$BUCKET_NAME${NC}"
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
}

main() {
    echo -e "${BLUE}┌─────────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│  Деплой фронтенда в Yandex Object Storage │${NC}"
    echo -e "${BLUE}└─────────────────────────────────────────┘${NC}"
    echo ""
    
    check_dependencies
    load_secrets
    clean_bucket "$1"
    build_project
    deploy
    show_url
}

main "$1"