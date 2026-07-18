with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace("app.listen(PORTORT", "app.listen(PORT")

with open('server.ts', 'w') as f:
    f.write(content)
