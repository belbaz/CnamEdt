// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { getSchoolYearRange, getSchoolYearLabel } from '@/utils/dateUtils';
import { useI18n } from '@/i18n/I18nContext';
import styles from './YearCalendar.module.css';
import HoverTooltip from './HoverTooltip';

// Mois de l'année scolaire (Septembre à Août)
const SCHOOL_MONTHS_INDICES = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7]; // 0 = Janvier
// Noms courts pour l'affichage compact mais lisible
const MONTH_NAMES = ['Sept', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août'];
const FULL_MONTH_NAMES = [
    'Septembre', 'Octobre', 'Novembre', 'Décembre',
    'Janvier', 'Février', 'Mars', 'Avril',
    'Mai', 'Juin', 'Juillet', 'Août'
];
const DAYS_OF_WEEK_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAYS_OF_WEEK_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const YearCalendar = ({ events, onDateClick, showTooltips = true }) => {
    const { t } = useI18n();
    const schoolYear = getSchoolYearRange();
    const yearLabel = getSchoolYearLabel();
    
    // État pour basculer entre les vues : 'grid' (mois carrés) ou 'planner' (planning mural)
    // Par défaut 'planner' car c'était la demande la plus récente
    const [viewType, setViewType] = useState('planner');

    // Organiser les événements par date (YYYY-MM-DD)
    const eventsByDate = useMemo(() => {
        const map = new Map();
        events.forEach(event => {
            const date = new Date(event.start);
            const key = date.toISOString().split('T')[0];
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(event);
        });
        return map;
    }, [events]);

    // Données pour la vue PLANNER (Matrix)
    const matrixData = useMemo(() => {
        const startYear = schoolYear.start.getFullYear();
        const endYear = schoolYear.end.getFullYear();

        const columns = SCHOOL_MONTHS_INDICES.map((monthIndex, i) => {
            const year = monthIndex >= 8 ? startYear : endYear;
            const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

            const days = [];
            for (let day = 1; day <= 31; day++) {
                if (day > daysInMonth) {
                    days.push({ type: 'empty', key: `empty-${monthIndex}-${day}` });
                } else {
                    const date = new Date(year, monthIndex, day);
                    const localDateKey = [
                        date.getFullYear(),
                        String(date.getMonth() + 1).padStart(2, '0'),
                        String(date.getDate()).padStart(2, '0')
                    ].join('-');

                    const dayEvents = eventsByDate.get(localDateKey) || [];
                    const dayOfWeek = date.getDay(); 
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                    days.push({
                        type: 'day',
                        dayNum: day,
                        dayOfWeek: dayOfWeek,
                        date: date,
                        isWeekend: isWeekend,
                        hasCourse: dayEvents.length > 0,
                        courseCount: dayEvents.length,
                        isToday: new Date().toDateString() === date.toDateString(),
                        key: localDateKey
                    });
                }
            }

            return {
                name: MONTH_NAMES[i],
                fullName: FULL_MONTH_NAMES[i],
                year: year,
                days: days,
                monthIndex: monthIndex
            };
        });

        return columns;
    }, [schoolYear, eventsByDate]);

    // Données pour la vue GRID (Mois classiques)
    const gridData = useMemo(() => {
        const months = [];
        const startDate = new Date(schoolYear.start);
        const endDate = new Date(schoolYear.end);

        let currentMonthDate = new Date(startDate);
        currentMonthDate.setDate(1);

        while (currentMonthDate <= endDate) {
            const monthIndex = currentMonthDate.getMonth();
            const year = currentMonthDate.getFullYear();
            const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(currentMonthDate);
            const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
            
            // Premier jour de la semaine (0=Dimanche, 1=Lundi...) => On veut Lundi=0
            let firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
            firstDayOfWeek = (firstDayOfWeek + 6) % 7;

            const days = [];
            
            // Cellules vides avant le 1er
            for (let i = 0; i < firstDayOfWeek; i++) {
                days.push({ type: 'empty', key: `empty-${monthIndex}-${i}` });
            }

            // Jours du mois
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, monthIndex, d);
                const localDateKey = [
                    date.getFullYear(),
                    String(date.getMonth() + 1).padStart(2, '0'),
                    String(date.getDate()).padStart(2, '0')
                ].join('-');

                const dayEvents = eventsByDate.get(localDateKey) || [];
                const isToday = new Date().toDateString() === date.toDateString();

                days.push({
                    type: 'day',
                    dayNumber: d,
                    date: date,
                    hasCourse: dayEvents.length > 0,
                    courseCount: dayEvents.length,
                    isToday: isToday,
                    key: localDateKey
                });
            }

            months.push({
                name: monthName,
                year: year,
                days: days,
                key: `${year}-${monthIndex}`
            });

            currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
        }

        return months;
    }, [schoolYear, eventsByDate]);

    const toggleView = () => {
        setViewType(prev => prev === 'grid' ? 'planner' : 'grid');
    };

    return (
        <div className={styles['year-calendar-container']}>
            <div className={styles['year-header']}>
                <h2 className={styles['year-title']}>{t('yearCalendar.title').replace('{year}', yearLabel)}</h2>
                <HoverTooltip
                    text={viewType === 'grid' ? t('yearCalendar.switchToPlanner') : t('yearCalendar.switchToCalendar')}
                    enabled={showTooltips}
                >
                <button 
                    className={styles['view-toggle-button']}
                    onClick={toggleView}
                >
                    {viewType === 'grid' ? t('yearCalendar.plannerView') : t('yearCalendar.calendarView')}
                </button>
                </HoverTooltip>
            </div>
            
            {viewType === 'planner' ? (
                <div className={styles['planner-container-wrapper']}>
                    <div className={styles['planner-grid']}>
                        {/* En-tête des mois */}
                        <div className={styles['planner-header-row']}>
                            <div className={styles['corner-cell']}></div>
                            {matrixData.map((col, i) => (
                                <HoverTooltip
                                    key={`head-${i}`}
                                    text={`${col.fullName} ${col.year}`}
                                    enabled={showTooltips}
                                    wrapperClassName={styles.yearCalTooltipGridItem}
                                >
                                <div className={styles['header-month-cell']}>
                                    <span className={styles['month-initial']}>{col.name}</span>
                                    <span className={styles['month-year']}>{col.year}</span>
                                </div>
                                </HoverTooltip>
                            ))}
                        </div>

                        {/* Lignes des jours 1 à 31 */}
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(dayNum => (
                            <div key={`row-${dayNum}`} className={styles['planner-day-row']}>
                                <div className={styles['day-number-cell']}>{dayNum}</div>
                                {matrixData.map((col, colIndex) => {
                                    const dayData = col.days[dayNum - 1];
                                    
                                    if (!dayData || dayData.type === 'empty') {
                                        return <div key={`empty-${colIndex}-${dayNum}`} className={`${styles['planner-cell']} ${styles['cell-invalid']}`} />;
                                    }

                                    const dayInitial = ['D', 'L', 'M', 'M', 'J', 'V', 'S'][dayData.dayOfWeek];
                                    const dayName = DAYS_OF_WEEK_FULL[dayData.dayOfWeek];

                                    const courseDayTip = dayData.hasCourse
                                        ? t('yearCalendar.coursesOnDay')
                                            .replace('{count}', dayData.courseCount)
                                            .replace('{dayName}', dayName)
                                            .replace('{day}', dayData.dayNum)
                                            .replace('{month}', col.fullName)
                                        : '';

                                    return (
                                        <HoverTooltip
                                            key={dayData.key}
                                            text={courseDayTip}
                                            enabled={showTooltips}
                                            wrapperClassName={styles.yearCalTooltipGridItem}
                                        >
                                        <div 
                                            className={`
                                                ${styles['planner-cell']} 
                                                ${dayData.isWeekend ? styles['cell-weekend'] : ''}
                                                ${dayData.hasCourse ? styles['cell-has-course'] : ''}
                                                ${dayData.isToday ? styles['cell-today'] : ''}
                                            `}
                                            onClick={() => dayData.hasCourse && onDateClick && onDateClick(dayData.date)}
                                        >
                                            <span className={styles['cell-day-initial']}>{dayInitial}</span>
                                        </div>
                                        </HoverTooltip>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className={styles['months-grid']}>
                    {gridData.map(month => (
                        <div key={month.key} className={styles['month-container']}>
                            <div className={styles['month-title']}>
                                {month.name} {month.year}
                            </div>
                            
                            <div className={styles['days-grid']}>
                                {DAYS_OF_WEEK_SHORT.map((d, i) => (
                                    <div key={`head-${i}`} className={styles['day-name']}>{d}</div>
                                ))}
                                
                                {month.days.map(day => {
                                    if (day.type === 'empty') {
                                        return <div key={day.key} className={`${styles['day-cell']} ${styles['empty']}`} />;
                                    }
                                    
                                    const courseDateTip = day.hasCourse
                                        ? t('yearCalendar.coursesOnDate')
                                            .replace('{count}', day.courseCount)
                                            .replace('{date}', day.date.toLocaleDateString())
                                        : '';

                                    return (
                                        <HoverTooltip
                                            key={day.key}
                                            text={courseDateTip}
                                            enabled={showTooltips}
                                            wrapperClassName={`${styles.yearCalTooltipGridItem} ${styles.yearCalTooltipDayCell}`}
                                        >
                                        <div 
                                            className={`
                                                ${styles['day-cell']} 
                                                ${day.hasCourse ? styles['has-course'] : ''} 
                                                ${day.isToday ? styles['is-today'] : ''}
                                            `}
                                            onClick={() => day.hasCourse && onDateClick && onDateClick(day.date)}
                                        >
                                            {day.dayNumber}
                                            {day.hasCourse && (
                                                <div className={styles['day-tooltip']}>
                                                    {t('yearCalendar.courses').replace('{count}', day.courseCount)}
                                                </div>
                                            )}
                                        </div>
                                        </HoverTooltip>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Légende */}
            <div className={styles['legend-container']}>
                <div className={styles['legend-item']}>
                    <div className={`${styles['legend-color']} ${styles['legend-has-course']}`}></div>
                    <span>{t('yearCalendar.dayWithCourse')}</span>
                </div>
                <div className={styles['legend-item']}>
                    <div className={`${styles['legend-color']} ${styles['legend-today']}`}></div>
                    <span>{t('yearCalendar.today')}</span>
                </div>
                <div className={styles['legend-item']}>
                    <div className={`${styles['legend-color']} ${styles['legend-weekend']}`}></div>
                    <span>{t('yearCalendar.weekend')}</span>
                </div>
                <div className={styles['legend-item']}>
                    <div className={`${styles['legend-color']} ${styles['legend-no-course']}`}></div>
                    <span>{t('yearCalendar.noCourse')}</span>
                </div>
            </div>
        </div>
    );
};

export default YearCalendar;

