$(document).ready(function () {
    $('.MultiCarousel').each(function () {// nguyên file này của vũ
        const carousel = $(this);
        const inner = carousel.find('.MultiCarousel-inner');
        const items = inner.find('.item');
        const slide = parseInt(carousel.attr('data-slide')) || 1;
        let index = 0;

        const totalItems = items.length;
        const btnLeft = carousel.find('.leftBtn');
        const btnRight = carousel.find('.rightBtn');

        // Hàm update transform
        function update() {
            const itemWidth = items.outerWidth(true);
            const transform = -index * itemWidth;
            inner.css('transform', `translateX(${transform}px)`);
            // Khi sử dụng vòng lặp, không disable các button
            btnLeft.prop('disabled', false);
            btnRight.prop('disabled', false);
        }

        // Tính số item hiển thị theo width
        function slideVisible() {
            const width = carousel.width();
            const itemWidth = items.outerWidth(true) || 1;
            return Math.floor(width / itemWidth) || 1;
        }

        // Tính chỉ số bắt đầu lớn nhất để hiển thị các item còn lại (có thể là partial page)
        function lastIndex() {
            const sv = slideVisible();
            if (totalItems <= sv) return 0;
            const rem = totalItems % sv;
            if (rem === 0) return Math.max(totalItems - sv, 0);
            return Math.max(totalItems - rem, 0);
        }

        btnLeft.click(function () {
            const last = lastIndex();
            // Nếu trượt lùi vượt quá đầu, quay về trang cuối (wrap-around)
            if (index - slide < 0) {
                index = last;
            } else {
                index = index - slide;
            }
            update();
        });
        btnRight.click(function () {
            const last = lastIndex();
            // Nếu đang ở trang cuối thì Next sẽ wrap về đầu
            if (index === last) {
                index = 0;
            } else if (index + slide > last) {
                // Nếu bước tiếp theo vượt quá last page, nhảy tới last page (partial)
                index = last;
            } else {
                index = index + slide;
            }
            update();
        });

        $(window).resize(update);
        update();

    
    });
});
