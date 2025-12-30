document.addEventListener('DOMContentLoaded', () => {
    const account_id = localStorage.getItem('account_id');
    console.log('account_id do localStorage:', account_id);
    if (!account_id) {
        // window.location.href = 'login.php';
        // return;
    }
    fetch('backend/player.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            // window.location.href = 'login.php';
            // return;
        }
            // Preencher dados da conta
            document.getElementById('account-welcome').innerHTML = `Welcome to your account <b>${data.name}</b>!`;
            document.getElementById('account-status-icon').innerHTML = `<span style="color:green;font-weight:bold;">●</span>`;
            document.getElementById('account-status-info').innerHTML = `
                <span style="color:green;font-size:1.2em;font-weight:bold;">Premium Account</span><br>
                Your Premium Time expires at <b>Oct 13 2026, 14:37:25 CEST</b>.<br>
                (Balance of Premium Time: <b>286 days</b>)
            `;
            // Preencher tabela de personagens (mock)
            const chars = [
                {name:'Ayanokoji Knight', voc:'Elite Knight', level:60, world:'Ustebra', status:'online', highlight:true},
                {name:'Death Matthew', voc:'Master Sorcerer', level:140, world:'Havera', status:'offline'},
                {name:'Elitte Berserk', voc:'Elite Knight', level:231, world:'Quintera', status:'offline'},
                {name:'Elitte Terror', voc:'Elite Knight', level:105, world:'Havera', status:'offline'},
                {name:'Elitte Tormes', voc:'Elite Knight', level:105, world:'Luminera', status:'offline'}
            ];
            let tbody = '';
            chars.forEach((c,i) => {
                tbody += `<tr${c.highlight? ' style="background:#fffbe0;font-weight:bold;"':''}>
                    <td>${i+1}</td>
                    <td>${c.name}<br><span style='font-size:0.95em;color:#bfa;'>${c.voc} - Level ${c.level} - On ${c.world}</span></td>
                    <td></td>
                    <td>${c.status==='online'?'<span style="color:green;">●</span>':'<span style="color:#a00;">●</span>'}</td>
                    <td><a href="#" style="color:#06c;">[Edit]</a> <a href="#" style="color:#a00;">[Delete]</a></td>
                </tr>`;
            });
            document.querySelector('#characters-table tbody').innerHTML = tbody;
    })
    .catch(() => {
        // window.location.href = 'login.php';
    });

    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('account_id');
            localStorage.removeItem('username');
            localStorage.removeItem('email');
            window.location.href = 'login.php';
        });
    }
});