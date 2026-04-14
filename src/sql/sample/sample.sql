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
  (2, 'FUT MESSE鶴見緑地', '〒538-0035 大阪府大阪市鶴見区緑地公園', 'https://maps.app.goo.gl/NVQVzj8tZWhow6HW9', '', '', '', true)
on conflict (id) do update
set facility_name = excluded.facility_name,
    address = excluded.address,
    map_url = excluded.map_url,
    phone_number = excluded.phone_number,
    email = excluded.email,
    remark = excluded.remark,
    is_active = excluded.is_active,
    updated_at = now();

insert into public.schedule (id, schedule_date, start_time, end_time, title, location_id, description, created_by)
values
  (1, '2026-04-16', '19:00', '21:00', 'Team Training', 1, 'Conditioning and tactical drills', 'f2e4d955-5f9d-4f10-970b-e55ad99e18fd'),
  (2, '2026-04-19', '14:00', '16:00', 'Practice Match', 2, 'Friendly match against local club', 'f2e4d955-5f9d-4f10-970b-e55ad99e18fd')
on conflict (id) do update
set schedule_date = excluded.schedule_date,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    title = excluded.title,
    location_id = excluded.location_id,
    description = excluded.description,
    created_by = excluded.created_by,
    updated_at = now();

insert into public.attendance (schedule_id, user_id, attendance_date, status, note)
values
  (1, 'cec118e7-747f-4537-b6fd-4b04dfba6dba', '2026-04-16', 'present', 'On time'),
  (2, 'cec118e7-747f-4537-b6fd-4b04dfba6dba', '2026-04-19', 'present', null)
on conflict (schedule_id, user_id) do update
set attendance_date = excluded.attendance_date,
    status = excluded.status,
    note = excluded.note,
    recorded_at = now();