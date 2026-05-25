from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def health(request):
    return JsonResponse({"status": "ok", "service": "spotter-eld-backend"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/trips/', include('trips.urls')),
    path('health/', health),
]