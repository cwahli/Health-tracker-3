with open('server.ts', 'r') as f:
    content = f.read()

# Extract the route
route_start = "app.get('/admin/migrate', async (req, res) => {"
route_end = "});\n\n  app.listen(PORT"

start_idx = content.find(route_start)
end_idx = content.find(route_end) + 4

route_code = content[start_idx:end_idx]

# Remove it from the end
content = content[:start_idx] + "\n  app.listen(PORT" + content[end_idx+15:]

# Insert it before if (process.env.NODE_ENV !== "production") {
target = '  if (process.env.NODE_ENV !== "production") {'
content = content.replace(target, route_code + '\n' + target)

with open('server.ts', 'w') as f:
    f.write(content)

