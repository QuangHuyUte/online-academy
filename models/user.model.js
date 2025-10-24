import db from '../utils/db.js';

// ------- Finders cơ bản -------
export function findById(id) {
  return db('users').where('id', id).first();
}

export function findByEmail(email) {
  // Case-insensitive để đồng nhất với UNIQUE (lower(email)) nếu có
  return db('users').whereRaw('lower(email) = lower(?)', [email]).first();
}

export function listAll() {
  return db('users').orderBy('id', 'asc');
}

export function listByRole(role) {
  return db('users').where('role', role).orderBy('id', 'asc');
}

// ------- CRUD -------
export function add(user) {
  // Trả về [{ id }] trên Postgres
  return db('users').insert(user).returning('id');
}

export function patch(id, user) {
  // Lưu ý: Ở route nên WHITELIST field cho phép sửa (name, avatar...), tránh sửa role/password ngoài ý muốn
  return db('users').where('id', id).update(user);
}

export function remove(id) {
  // Cực kỳ mạnh tay vì schema đang ON DELETE CASCADE tới nhiều bảng (instructors, enrollments, reviews, watchlist, progress)
  return db('users').where('id', id).del();
}

// ------- Admin: search + paging (tùy chọn, nhưng nên có) -------
export function findPage(offset, limit, q = '', role = null) {
  const query = db('users').orderBy('id', 'asc').offset(offset).limit(limit);
  if (role) query.where('role', role);
  if (q) {
    query.andWhere(function () {
      this.whereILike('name', `%${q}%`)
          .orWhereILike('email', `%${q}%`);
    });
  }
  return query;
}

export function countAll(q = '', role = null) {
  const query = db('users').count('* as amount').first();
  if (role) query.where('role', role);
  if (q) {
    query.andWhere(function () {
      this.whereILike('name', `%${q}%`)
          .orWhereILike('email', `%${q}%`);
    });
  }
  return query;
}

// ------- Delete an toàn (khuyến nghị dùng thay cho remove ở route Admin) -------
export async function safeRemove(id) {
  const me = await findById(id);
  if (!me) return { ok: false, reason: 'NOT_FOUND' };

  // Không cho xóa admin cuối cùng
  if (me.role === 'admin') {
    const { amount } = await db('users').where('role', 'admin').count('* as amount').first();
    if (Number(amount) <= 1) return { ok: false, reason: 'LAST_ADMIN' };
  }

  // Nếu user là instructor có course đang phụ trách -> xóa sẽ lỗi (courses.instructor_id RESTRICT) qua bảng instructors
  // => Tùy nghiệp vụ: chặn xóa, hoặc buộc chuyển giao course trước
  if (me.role === 'instructor') {
    const row = await db('instructors as i')
      .leftJoin('courses as c', 'c.instructor_id', 'i.id')
      .where('i.user_id', id)
      .count('c.id as cnt')
      .first();
    // Nếu có khoá học đang phụ trách, chặn xóa
    if (row && Number(row.cnt) > 0) return { ok: false, reason: 'INSTRUCTOR_HAS_COURSES' };
  }

  const affected = await remove(id);
  return { ok: affected > 0, affected };
}
