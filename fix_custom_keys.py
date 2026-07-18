import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace('deletedCustomBiomarkerKeys: Array.from(deletedCustomKeys)', 'deletedCustomBiomarkerKeys: deletedCustomKeys')
content = content.replace('deletedCustomBiomarkerKeys: updatedProfile?.deletedCustomBiomarkerKeys || []', 'deletedCustomBiomarkerKeys: updatedProfile?.deletedCustomBiomarkerKeys || {}')

def replace_array_append(content, var_name):
    pattern = rf'{var_name}\s*=\s*\[\s*\.\.\.\({var_name} \|\| \[\]\),\s*([^\]]+)\s*\]'
    replacement = rf'{var_name} = {{ ...({var_name} || {{}}), [\1]: Date.now() }}'
    return re.sub(pattern, replacement, content)

content = replace_array_append(content, 'updatedProfile.deletedCustomBiomarkerKeys')

with open('src/App.tsx', 'w') as f:
    f.write(content)
