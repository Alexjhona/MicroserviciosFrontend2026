import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  user: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  login(): void {
    this.errorMessage = '';

    if (!this.user || !this.password) {
      this.errorMessage = 'Completa usuario y contraseña';
      return;
    }

    this.authService.login(this.user, this.password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Login failed', err);
        this.errorMessage = 'Usuario o contraseña incorrectos';
      }
    });
  }
}
