"""Alerting module for monitoring and alerting."""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable
from config import settings
from monitoring import logging_config

logger = logging_config.get_logger(__name__)

class Alert:
    def __init__(self, alert_type, severity, message, details=None):
        self.alert_type = alert_type
        self.severity = severity
        self.message = message
        self.details = details or {}
        self.timestamp = datetime.utcnow()

class AlertRule:
    def __init__(self, name, enabled=True):
        self.name = name
        self.enabled = enabled
        self.last_alert_time = None
        self.alert_cooldown = timedelta(minutes=5)

    async def check(self):
        return None

    def should_alert(self):
        if self.last_alert_time is None:
            return True
        return datetime.utcnow() - self.last_alert_time > self.alert_cooldown

    async def evaluate(self):
        if not self.enabled:
            return None
        alert = await self.check()
        if alert and self.should_alert():
            self.last_alert_time = datetime.utcnow()
            return alert
        return None

class AlertManager:
    def __init__(self):
        self.rules = []
        self.handlers = []
        self.running = False
        self.check_interval = settings.alert_check_interval

    def add_rule(self, rule):
        self.rules.append(rule)

    def add_handler(self, handler):
        self.handlers.append(handler)

    def add_default_rules(self):
        pass

    def add_default_handlers(self):
        self.add_handler(self.log_alert)

    def log_alert(self, alert):
        logger.warning("alert_triggered", alert_type=alert.alert_type, severity=alert.severity, message=alert.message)

    async def check_all_rules(self):
        alerts = []
        for rule in self.rules:
            try:
                alert = await rule.evaluate()
                if alert:
                    alerts.append(alert)
                    for handler in self.handlers:
                        try:
                            handler(alert)
                        except Exception:
                            pass
            except Exception:
                pass
        return alerts

    async def start(self):
        if not settings.enable_alerting:
            return
        self.running = True
        while self.running:
            await self.check_all_rules()
            import asyncio
            await asyncio.sleep(self.check_interval)

    def stop(self):
        self.running = False

alert_manager = AlertManager()

def setup_alerting():
    alert_manager.add_default_rules()
    alert_manager.add_default_handlers()
    return alert_manager
