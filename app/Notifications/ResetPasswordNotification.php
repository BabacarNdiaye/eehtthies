<?php

namespace App\Notifications;

use App\Mail\ResetPassword as ResetPasswordMail;
use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends BaseResetPassword
{
    public function toMail($notifiable): ResetPasswordMail
    {
        $url = url(route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], false));

        return (new ResetPasswordMail($url, $notifiable->name))
            ->to($notifiable->getEmailForPasswordReset());
    }
}
