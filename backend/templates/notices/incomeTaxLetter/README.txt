Place the Income Tax Letter .docx template here.

Template: "LETTER TO INCOME TAX FORM 46.docx" (only)

Placeholders (use {{PLACEHOLDER}} in the template):

Header / date:
- {{DISPATCH NO}}, {{ESTA CODE}}, {{DATE}}

Income Tax:
- {{Income Tax Address}}

Officer (signing letter; not necessarily Recovery Officer — user can enter in popup):
- {{OFFICER NAME}}, {{OFFICER FATHER NAME}}, {{OFFICER DESIGNATION}}
- {{RO ADDRESS}}

Employers (supports multiple):
- {{EMPLOYERS LIST}} / {{EMPLOYERS_LIST}} — inline: "Name1 (PAN1), Desig1; Name2 (PAN2), Desig2"
- {{EMPLOYERS LIST NEWLINES}} / {{EMPLOYERS_LIST_NEWLINES}} — one employer per line (same format)
- Loop (repeat block per employer): {{#employers}}{{name}} ({{pan}}), {{designation}}{{/employers}}
  Use e.g. "information relating to {{#employers}}{{name}} ({{pan}}), {{designation}}; {{/employers}} of M/s {{ESTA NAME}}"
  Or put each employer on its own line inside the loop.
- {{EMPLOYER NAME}}, {{EMPLOYER PAN}}, {{DESIGNATION OF EMPLOYER}} — first employer only (or establishment fallback)

Establishment / RRC:
- {{ESTA NAME}}
- {{OUTSTAND TOT WITH REC RRC}}, {{U/S}}, {{RRC PERIOD}}
