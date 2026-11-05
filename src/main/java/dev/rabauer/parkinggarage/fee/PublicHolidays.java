package dev.rabauer.parkinggarage.fee;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Month;

/**
 * Sundays and Bavarian public holidays (the garage's "Sonn- und Feiertagstarif").
 */
final class PublicHolidays {

    private PublicHolidays() {
    }

    static boolean isSundayOrHoliday(LocalDate date) {
        return date.getDayOfWeek() == DayOfWeek.SUNDAY || isHoliday(date);
    }

    private static boolean isHoliday(LocalDate date) {
        return isFixedHoliday(date) || isMovableHoliday(date);
    }

    private static boolean isFixedHoliday(LocalDate date) {
        int day = date.getDayOfMonth();
        return switch (date.getMonth()) {
            case JANUARY -> day == 1 || day == 6;
            case MAY -> day == 1;
            case AUGUST -> day == 15;
            case OCTOBER -> day == 3;
            case NOVEMBER -> day == 1;
            case DECEMBER -> day == 25 || day == 26;
            default -> false;
        };
    }

    private static boolean isMovableHoliday(LocalDate date) {
        LocalDate easter = easterSunday(date.getYear());
        long offset = date.toEpochDay() - easter.toEpochDay();
        // Good Friday, Easter Monday, Ascension, Whit Monday, Corpus Christi
        return offset == -2 || offset == 1 || offset == 39 || offset == 50 || offset == 60;
    }

    /** Anonymous Gregorian algorithm. */
    static LocalDate easterSunday(int year) {
        int a = year % 19;
        int b = year / 100;
        int c = year % 100;
        int d = b / 4;
        int e = b % 4;
        int f = (b + 8) / 25;
        int g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30;
        int i = c / 4;
        int k = c % 4;
        int l = (32 + 2 * e + 2 * i - h - k) % 7;
        int m = (a + 11 * h + 22 * l) / 451;
        int month = (h + l - 7 * m + 114) / 31;
        int day = (h + l - 7 * m + 114) % 31 + 1;
        return LocalDate.of(year, Month.of(month), day);
    }
}
