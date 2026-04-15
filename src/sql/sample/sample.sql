insert into public."user" (id, full_name, role, player_id, is_active_player)
values
  ('f2e4d955-5f9d-4f10-970b-e55ad99e18fd', 'Admin User', 'admin', null, true),
  ('cec118e7-747f-4537-b6fd-4b04dfba6dba', 'Koko', 'player', 'BRO-001', true)
on conflict (id) do update
set full_name = excluded.full_name,
    role = excluded.role,
    player_id = excluded.player_id,
    is_active_player = excluded.is_active_player;

insert into public.location_master (id, facility_name, address, map_url, phone_number, email, remark, is_active)
values
  (1, 'FUT MESSE 海老江', '〒553-0001 大阪府大阪市福島区海老江８丁目１６', 'https://maps.app.goo.gl/NqkHCcY8b1jLJoDj8', '', '', '', true),
  (2, 'FUT MESSE鶴見緑地', '〒538-0035 大阪府大阪市鶴見区緑地公園', 'https://maps.app.goo.gl/NVQVzj8tZWhow6HW9', '', '', '', true),
  (3, '鳥飼下地区 フットサル場', '〒566-0071 大阪府摂津市鳥飼下', 'https://maps.app.goo.gl/9fDsUwXfZFKM7KeV8', '', '', '', true),
  (4, '八尾市立南木の本防災体育館', '〒581-0042 大阪府八尾市南木の本３丁目１－９', 'https://maps.app.goo.gl/ECF8uyEGTrqQJxAJ9', '', '', '', true)
on conflict (id) do update
set facility_name = excluded.facility_name,
    address = excluded.address,
    map_url = excluded.map_url,
    phone_number = excluded.phone_number,
    email = excluded.email,
    remark = excluded.remark,
    is_active = excluded.is_active,
    updated_at = now();

insert into public.category_master (id, category_code, category_name, display_order, is_active)
values
  (1, 'practice', '練習', 1, true),
  (2, 'match', '試合', 2, true),
  (3, 'event', 'イベント', 3, true)
on conflict (id) do update
set category_code = excluded.category_code,
    category_name = excluded.category_name,
    display_order = excluded.display_order,
    is_active = excluded.is_active,
    updated_at = now();

insert into public.player_profile (
  user_id,
  photo_url,
  jersey_name,
  back_number,
  jersey_size,
  birth_date,
  nationality,
  position,
  current_status,
  remark
)
values
  (
    'cec118e7-747f-4537-b6fd-4b04dfba6dba',
    'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=600&q=80',
    'KOKO',
    10,
    'L',
    '2000-08-15',
    'Japan',
    'MF',
    true,
    'Captain candidate'
  )
on conflict (user_id) do update
set photo_url = excluded.photo_url,
    jersey_name = excluded.jersey_name,
    back_number = excluded.back_number,
    jersey_size = excluded.jersey_size,
    birth_date = excluded.birth_date,
    nationality = excluded.nationality,
    position = excluded.position,
    current_status = excluded.current_status,
    remark = excluded.remark,
    updated_at = now();

insert into public.schedule (id, schedule_date, start_time, end_time, category_id, location_id, description, created_by)
values
  (1, '2026-04-16', '19:00', '21:00', 1, 1, 'Conditioning and tactical drills', 'f2e4d955-5f9d-4f10-970b-e55ad99e18fd'),
  (2, '2026-04-19', '14:00', '16:00', 2, 2, 'Friendly match against local club', 'f2e4d955-5f9d-4f10-970b-e55ad99e18fd'),
  (3, '2026-04-22', '18:30', '20:00', 3, 1, 'Team meeting and uniform handout', 'f2e4d955-5f9d-4f10-970b-e55ad99e18fd')
on conflict (id) do update
set schedule_date = excluded.schedule_date,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    category_id = excluded.category_id,
    location_id = excluded.location_id,
    description = excluded.description,
    created_by = excluded.created_by,
    updated_at = now();

insert into public.attendance (schedule_id, user_id, attendance_date, status, note)
values
  (1, 'cec118e7-747f-4537-b6fd-4b04dfba6dba', '2026-04-16', 'present', 'On time'),
  (2, 'cec118e7-747f-4537-b6fd-4b04dfba6dba', '2026-04-19', 'present', null),
  (3, 'cec118e7-747f-4537-b6fd-4b04dfba6dba', '2026-04-22', 'late', 'Joining after work')
on conflict (schedule_id, user_id) do update
set attendance_date = excluded.attendance_date,
    status = excluded.status,
    note = excluded.note,
    recorded_at = now();
