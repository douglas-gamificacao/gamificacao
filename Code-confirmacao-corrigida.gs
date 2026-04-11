const FIXED_TO = "douglass@prof.educacao.sp.gov.br";
const SUBJECT_PREFIX = "[Gamificação Total]";

function doPost(e) {
  const result = processRequest_(e);
  return HtmlService
    .createHtmlOutput(`
      <html>
        <body>
          <script>
            const payload = ${JSON.stringify(result)};
            try { window.parent.postMessage(payload, '*'); } catch (e) {}
            try { window.top.postMessage(payload, '*'); } catch (e) {}
          </script>
        </body>
      </html>
    `)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function processRequest_(e) {
  try {
    const rawPayload = e && e.parameter ? e.parameter.payload : null;
    if (!rawPayload) {
      return buildResult_(false, "Nenhum dado foi recebido.");
    }

    const payload = JSON.parse(rawPayload);
    const studentName = safeString_(payload.studentName);
    const studentClass = safeString_(payload.studentClass);
    const cardTitle = safeString_(payload.cardTitle);
    const notes = safeString_(payload.notes);
    const teacherEmail = safeString_(payload.teacherEmail) || FIXED_TO;
    const files = Array.isArray(payload.files) ? payload.files : [];

    if (!studentName) return buildResult_(false, "Nome do estudante não informado.");
    if (!studentClass) return buildResult_(false, "Turma do estudante não informada.");
    if (!cardTitle) return buildResult_(false, "Carta não informada.");
    if (!files.length) return buildResult_(false, "Nenhum arquivo foi enviado.");
    if (files.length > 10) return buildResult_(false, "Máximo de 10 arquivos por envio.");

    const now = new Date();
    const protocol = buildProtocol_(now);

    const blobs = files.map(file => {
      const bytes = Utilities.base64Decode(file.data);
      return Utilities.newBlob(bytes, file.type || "application/octet-stream", file.name || "arquivo");
    });

    const subject = `${SUBJECT_PREFIX} ${studentName} - ${cardTitle}`;
    const body =
      "Novo trabalho enviado pela plataforma da Gamificação Total.\n\n" +
      `Estudante: ${studentName}\n` +
      `Turma: ${studentClass}\n` +
      `Carta: ${cardTitle}\n` +
      `Data e hora do processamento: ${formatDateTime_(now)}\n` +
      `Quantidade de arquivos: ${files.length}\n` +
      `Protocolo: ${protocol}\n\n` +
      `Observações:\n${notes || "Nenhuma"}\n`;

    GmailApp.sendEmail(teacherEmail, subject, body, {
      attachments: blobs,
      name: "Gamificação Total"
    });

    return buildResult_(true, "Trabalho enviado com sucesso.", {
      protocol,
      sentAt: now.toISOString(),
      studentName,
      studentClass,
      cardTitle,
      notes,
      fileCount: files.length
    });

  } catch (error) {
    return buildResult_(false, "Erro no processamento: " + error.message);
  }
}

function buildResult_(success, message, extra) {
  return Object.assign({
    source: "gamificacao-total-backend",
    success: success,
    message: message
  }, extra || {});
}

function safeString_(value) {
  return value == null ? "" : String(value).trim();
}

function buildProtocol_(dateObj) {
  const timestamp = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  const random = Math.floor(Math.random() * 900 + 100);
  return `GT-${timestamp}-${random}`;
}

function formatDateTime_(dateObj) {
  return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
}
