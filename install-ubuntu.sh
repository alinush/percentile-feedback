set -e
sudo apt-get install nginx

# Read how to setup nginx here: https://nginx.org/en/docs/beginners_guide.html
sudo cp nginx/percentile /etc/nginx/sites-available/
sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/percentile /etc/nginx/sites-enabled/

sudo service nginx restart
