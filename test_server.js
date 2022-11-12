const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/' || '/index.html', function(req, res) { res.render('index.html');
});
app.get('/panel.html', function(req, res) { res.render('panel.html');
});

app.listen(port, function() { console.log(`fe_submission02 app listening on port ${port}`);
});
