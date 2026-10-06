@extends('mail.layout')

@section('title', $subjectLine)
@section('eyebrow', $eyebrow)

@section('content')
    <p style="margin: 0 0 16px; font-size: 15px; color: #15263a;">{{ $greeting }}</p>
    @foreach($lines as $line)
        <p style="margin: 0 0 14px; font-size: 15px; line-height: 1.7; color: #15263a;">{{ $line }}</p>
    @endforeach

    <p style="margin: 24px 0; text-align: center;">
        <a href="{{ $actionUrl }}" style="display: inline-block; padding: 12px 24px; background-color: #0b1728; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">{{ $actionLabel }}</a>
    </p>
@endsection
