# Дубль iOS-конфігу `config 2.xml`

> ЗАКРИТО 2026-08-02 (dev): diff із канонічним порожній, файл видалено,
> `ai:scan:all` 3→2 issues. Рішення зафіксоване в STATUS.md 2026-08-01, п. вердикту qa D2.

У `ios/App/App/` лежить `config 2.xml` — файл із суфіксом ` 2`, тобто копія, яку
заборонено правилом file hygiene (`CLAUDE.md`). Untracked, у git не потрапив.
З'явився до цієї сесії (був у `git status` на її старті), до правки
observer-timezone стосунку не має.

`npm run ai:scan:all` бачить його як warning
`suspect-generated-ios-config:config 2.xml` — саме він підняв кількість issues
з 2 до 3 проти зрізу в STATUS.md.

Де дивитись: `ios/App/App/config 2.xml` проти канонічного `ios/App/App/config.xml`.
Потрібне рішення: звірити з канонічним і видалити копію (файли не видаляю без
явного дозволу).
