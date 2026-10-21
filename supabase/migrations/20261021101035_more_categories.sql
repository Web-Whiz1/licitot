-- More subcategories, so every item has a place:
--   * Electronice: TVs/projectors and tablets/e-readers (sellers couldn't list a TV).
--   * Every main category gets an "Altele" (Other) bucket, always listed last.
-- Categories are public reference data (RLS: read-only for everyone, see foundation migration);
-- they change only through migrations like this one.

with children (parent_slug, slug, name, sort_order) as (
  values
    ('electronice', 'tv-proiectoare', 'TV & Proiectoare', 2),
    ('electronice', 'tablete', 'Tablete & E-readere', 4),
    ('electronice', 'electronice-altele', 'Altele', 99),
    ('auto-moto', 'auto-moto-altele', 'Altele', 99),
    ('casa-gradina', 'casa-gradina-altele', 'Altele', 99),
    ('moda', 'moda-altele', 'Altele', 99),
    ('sport', 'sport-altele', 'Altele', 99),
    ('colectii', 'colectii-altele', 'Altele', 99),
    ('copii', 'copii-altele', 'Altele', 99),
    ('carti', 'carti-altele', 'Altele', 99)
)
insert into public.categories (slug, name, parent_id, sort_order)
select c.slug, c.name, p.id, c.sort_order
from children c
join public.categories p on p.slug = c.parent_slug and p.parent_id is null
on conflict (slug) do nothing;

-- Electronice order: phones, TVs, laptops, tablets, photo/video, consoles, audio, other.
update public.categories as c
set sort_order = v.sort_order
from (
  values
    ('telefoane', 1),
    ('tv-proiectoare', 2),
    ('laptopuri-pc', 3),
    ('tablete', 4),
    ('foto-video', 5),
    ('console-jocuri', 6),
    ('audio', 7)
) as v (slug, sort_order)
where c.slug = v.slug;
