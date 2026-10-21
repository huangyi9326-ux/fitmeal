# Node.js 后端运行时
FROM node:20-alpine

WORKDIR /app

# 先复制 package.json 利用 Docker 缓存
COPY package*.json ./
RUN npm install --production

# 复制源码
COPY src ./src

# 创建数据目录（Railway 有持久化卷时会挂载到这里）
RUN mkdir -p /app/data /app/uploads

EXPOSE 3000

CMD ["npm", "start"]
