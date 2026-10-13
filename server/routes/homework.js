export function registerHomeworkRoutes(app, services) {
  const {
    refreshAccounts,
    getUserSession,
    getAssignedTeacherLessonSubject,
    readStudentLessonHistory,
    readHomeworkAttachment,
    saveHomeworkAttachment,
    validateHomeworkUpload,
  } = services;

  app.get('/api/teacher/students/:studentId/homework/:entryId/attachment', async (req, res) => {
    await refreshAccounts();
    const subject = await getAssignedTeacherLessonSubject(req, res);
    if (!subject) return;
    if (subject.trial) return res.status(404).json({ error: 'Домашнее задание ученика не найдено.' });
    const history = await readStudentLessonHistory(subject.id);
    if (!history.some((entry) => entry.id === req.params.entryId && entry.nextHomework)) return res.status(404).json({ error: 'Домашнее задание не найдено.' });
    const file = await readHomeworkAttachment(subject.id, req.params.entryId);
    if (!file) return res.status(404).json({ error: 'Файл не прикреплён.' });
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(file.buffer);
  });

  app.post('/api/student/homework/:entryId/attachment', async (req, res) => {
    await refreshAccounts();
    const user = getUserSession(req);
    if (!user || user.account.role !== 'student') return res.status(403).json({ error: 'Прикрепить файл может только ученик.' });
    let file;
    try { file = validateHomeworkUpload(req.body || {}); }
    catch (error) { return res.status(400).json({ error: error.message || 'Проверьте выбранный файл.' }); }
    const history = await readStudentLessonHistory(user.account.id);
    if (!history.some((entry) => entry.id === req.params.entryId && entry.nextHomework)) return res.status(404).json({ error: 'Домашнее задание не найдено.' });
    try { await saveHomeworkAttachment(user.account.id, req.params.entryId, file); }
    catch (error) { console.error('Could not save homework attachment:', error); return res.status(503).json({ error: 'Не удалось сохранить файл. Попробуйте ещё раз позже.' }); }
    return res.json({ ok: true, filename: file.filename });
  });

  app.get('/api/student/homework/:entryId/attachment', async (req, res) => {
    await refreshAccounts();
    const user = getUserSession(req);
    if (!user || user.account.role !== 'student') return res.status(403).json({ error: 'Доступ запрещён.' });
    const file = await readHomeworkAttachment(user.account.id, req.params.entryId);
    if (!file) return res.status(404).json({ error: 'Файл не прикреплён.' });
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(file.buffer);
  });

}
