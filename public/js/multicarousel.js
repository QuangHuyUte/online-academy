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
            btnLeft.prop('disabled', index === 0);
            btnRight.prop('disabled', index >= totalItems - slideVisible());
        }

        // Tính số item hiển thị theo width
        function slideVisible() {
            const width = carousel.width();
            const itemWidth = items.outerWidth(true);
            return Math.floor(width / itemWidth);
        }

        btnLeft.click(function () {
            index = Math.max(index - slide, 0);
            update();
        });
        btnRight.click(function () {
            index = Math.min(index + slide, totalItems - slideVisible());
            update();
        });

        $(window).resize(update);
        update();

    
    });
});
