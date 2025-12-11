const API_BASE = 'https://d5dmt7e7bffqdue78048.y1haggxy.apigw.yandexcloud.net';

// Загрузка книг при старте
document.addEventListener('DOMContentLoaded', loadBooks);

async function loadBooks() {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/books`);
        const books = await response.json();
        displayBooks(books);
    } catch (error) {
        console.error('Error loading books:', error);
        alert('Ошибка загрузки книг');
    } finally {
        showLoading(false);
    }
}

function displayBooks(books) {
    const grid = document.getElementById('booksGrid');

    if (!Array.isArray(books)) {
        console.error('Ошибка: books не является массивом', books);
        grid.innerHTML = '<p>Ошибка загрузки данных</p>';
        return;
    }

    if (books.length === 0) {
        grid.innerHTML = '<p>Книги не найдены</p>';
        return;
    }

    grid.innerHTML = books.map(book => `
                <div class="book-card">
                    <div class="book-title">${escapeHtml(book.title)}</div>
                    <div class="book-author">${escapeHtml(book.author)}</div>
                    <div class="book-description">${escapeHtml(book.description || 'Описание отсутствует')}</div>
                    <div class="book-format">
                        <small>Формат: ${book.file_format.toUpperCase()}</small>
                    </div>
                    <div class="book-actions">
                        <button class="btn btn-primary" onclick="downloadBook('${book.book_id}')">
                            Скачать
                        </button>
                    </div>
                </div>
            `).join('');
}

async function downloadBook(bookId) {
    try {
        const response = await fetch(`${API_BASE}/download?bookId=${encodeURIComponent(bookId)}`);
        const data = await response.json();

        if (data.download_url) {
            window.open(data.download_url, '_blank');
        } else {
            alert('Ошибка скачивания');
        }
    } catch (error) {
        console.error('Download error:', error);
        alert('Ошибка скачивания');
    }
}

async function searchBooks() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/books${query ? `?search=${encodeURIComponent(query)}` : ''}`);
        
        // Проверяем статус ответа
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const books = await response.json();
        
        // Дополнительная проверка
        if (!Array.isArray(books)) {
            console.error('Ошибка: ответ не является массивом', books);
            throw new Error('Некорректный ответ от сервера');
        }
        
        displayBooks(books);
    } catch (error) {
        console.error('Search error:', error);
        alert('Ошибка поиска: ' + error.message);
        document.getElementById('booksGrid').innerHTML = '<p>Ошибка загрузки данных</p>';
    } finally {
        showLoading(false);
    }
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    loadBooks();
}

// Обработка добавления новой книги
document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('bookFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Выберите файл книги');
        return;
    }

    // Подготавливаем метаданные
    const metadata = {
        title: document.getElementById('title').value,
        author: document.getElementById('author').value,
        description: document.getElementById('description').value,
        file_format: document.getElementById('format').value,
        file_name: file.name
    };

    console.log("1. Отправка метаданных: ",  metadata);

    try {
        // Отправляем метаданные на бэкенд
        const response = await fetch(`${API_BASE}/books`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadata)
        });

        const result = await response.json();
        console.log("2. Ответ бекэнда: ", result);

        if (response.ok) {
            // Получаем URL для загрузки файла
            const uploadUrl = result.upload_url;
            console.log("3. Upload URL: ", uploadUrl);
            
            console.log("4. Uplading file...");
            // Загружаем файл напрямую в Object Storage
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': getContentType(metadata.file_format)
                },
                body: file  // Отправляем сам файл
            });

            console.log("5. Upload status: ", uploadResponse.status, uploadResponse.ok);

            if (uploadResponse.ok) {
                alert('Книга успешно добавлена!');
                this.reset();
                loadBooks(); // Обновляем список книг
            } else {
                alert('Ошибка загрузки файла. Статус: ' + uploadResponse.status);
            }
        } else {
            alert('Ошибка добавления книги: ' + (result.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Ошибка добавления книги', error);
    }
});

function getContentType(format){
    const types = {
        'pdf': 'application/pdf',
        'epub': 'application/epub+zip',
        'djvu': 'image/vnd.djvu',
        'txt': 'text/plain',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    return types[format.toLowerCase()] || 'application/octet-stream';
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('booksGrid').style.display = show ? 'none' : 'grid';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}