/**
 * 统一响应格式
 * 成功：{ code: 0, message: 'success', data: ... }
 * 失败：{ code: 1, message: '错误信息' }
 */
function success(res, data = null, message = 'success') {
  return res.json({ code: 0, message, data });
}

function fail(res, message = '请求失败', status = 400) {
  return res.status(status).json({ code: 1, message });
}

module.exports = { success, fail };
