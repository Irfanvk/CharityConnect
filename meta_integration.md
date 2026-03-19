How to verify backend locally now

Set env vars and restart backend
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=meta
WHATSAPP_API_VERSION=v22.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_TOKEN=your_permanent_token
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token
Verify webhook challenge endpoint (PowerShell)
Run:
Invoke-WebRequest -Uri "http://localhost:8000/notifications/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=your_custom_verify_token&hub.challenge=123456"

Expect:
StatusCode 200
Body 123456

Negative token test
Run same command with wrong hub.verify_token
Expect:
StatusCode 403
Body forbidden
Verify POST webhook receiver manually
Run:
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/notifications/whatsapp/webhook" -ContentType "application/json" -Body '{"object":"whatsapp_business_account","entry":[{"changes":[{"value":{"messages":[{"id":"wamid.test1","from":"919999999999","type":"text","timestamp":"1710000000"}],"statuses":[{"id":"wamid.test1","status":"delivered","recipient_id":"919999999999","timestamp":"1710000001"}]}}]}]}'

Expect response like:
received: true
object: whatsapp_business_account
message_events: 1
status_events: 1

Verify outbound send endpoint
Use admin token:
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/notifications/send-whatsapp" -Headers @{ Authorization = "Bearer YOUR_ADMIN_JWT" } -ContentType "application/json" -Body '{"phone_number":"+919999999999","message":"Test from CharityHub"}'

Expect:
queued true (if configured and accepted)
or clear failure reason in message

How to verify from Meta dashboard

Callback URL
Set to:
https://your-backend-domain/notifications/whatsapp/webhook
Verify token
Must exactly match WHATSAPP_VERIFY_TOKEN in backend env
Subscribe fields
messages
message_status (or statuses depending UI label)
Click Verify and save
If success, Meta confirms immediately
If fail, usually token mismatch, wrong URL path, or backend not publicly reachable
Important backend checks if verification fails

Ensure backend URL is public HTTPS and reachable from internet.
Ensure reverse proxy does not block query params with dots:
hub.mode, hub.verify_token, hub.challenge.
Check backend logs during verify call for 403 vs 200.
Confirm there is no auth middleware on webhook path.
Confirm exact path includes /notifications/whatsapp/webhook.