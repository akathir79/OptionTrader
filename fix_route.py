#!/usr/bin/env python3

# Read app.py file
with open('app.py', 'r') as f:
    content = f.read()

# Find the position to insert the new route
insert_pos = content.find('@app.route(\'/get_access_token\'')

if insert_pos != -1:
    # Insert the payoff chart route before get_access_token
    new_route = '''@app.route("/payoff-chart")
def payoff_chart():
    return render_template("payoff_chart.html")

'''
    
    # Insert the new route
    updated_content = content[:insert_pos] + new_route + content[insert_pos:]
    
    # Write back to app.py
    with open('app.py', 'w') as f:
        f.write(updated_content)
    
    print("Successfully added payoff chart route to app.py")
else:
    print("Could not find insertion point in app.py")